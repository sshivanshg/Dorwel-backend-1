import mongoose from 'mongoose';
import paginate from './plugins/paginatePlugin';
import toJSON from './plugins/toJSONPlugin';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';

const paymentSchema = mongoose.Schema(
	{
		user: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'users',
			required: true
		},
		subscription: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'subscriptions'
		},
		// Razorpay payment details
		razorpayPaymentId: {
			type: String,
			required: true,
			unique: true
		},
		razorpayOrderId: {
			type: String,
			required: true
		},
		razorpaySignature: {
			type: String
		},
		// Payment details
		amount: {
			type: Number,
			required: true,
			min: 0
		},
		currency: {
			type: String,
			default: 'INR',
			enum: ['INR', 'USD', 'EUR']
		},
		// Payment status
		status: {
			type: String,
			enum: ['pending', 'captured', 'failed', 'refunded', 'partially_refunded'],
			default: 'pending'
		},
		// Payment method details
		paymentMethod: {
			type: {
				type: String,
				enum: ['card', 'netbanking', 'wallet', 'upi', 'emi'],
				required: true
			},
			card: {
				last4: String,
				network: String,
				type: String
			},
			bank: String,
			wallet: String,
			vpa: String
		},
		// Payment timing
		paidAt: {
			type: Date
		},
		failedAt: {
			type: Date
		},
		// Refund details
		refund: {
			amount: {
				type: Number,
				default: 0
			},
			reason: String,
			refundedAt: Date,
			razorpayRefundId: String
		},
		// Payment description
		description: {
			type: String,
			required: true
		},
		// Payment metadata
		metadata: {
			type: mongoose.Schema.Types.Mixed,
			default: {}
		},
		// Error details for failed payments
		error: {
			code: String,
			description: String,
			source: String,
			step: String,
			reason: String
		},
		// Payment notes
		notes: [{
			content: {
				type: String,
				required: true
			},
			createdAt: {
				type: Date,
				default: Date.now
			},
			createdBy: {
				type: mongoose.SchemaTypes.ObjectId,
				ref: 'users'
			}
		}],
		// Receipt details
		receipt: {
			number: {
				type: String,
				unique: true
			},
			url: String,
			generatedAt: Date
		},
		// Tax details
		tax: {
			amount: {
				type: Number,
				default: 0
			},
			rate: {
				type: Number,
				default: 0
			},
			type: {
				type: String,
				enum: ['gst', 'vat', 'sales_tax', 'none'],
				default: 'none'
			}
		},
		// Fee details
		fee: {
			razorpay: {
				type: Number,
				default: 0
			},
			net: {
				type: Number,
				default: 0
			}
		}
	},
	{
		timestamps: true,
		toJSON: { virtuals: true }
	}
);

paymentSchema.plugin(toJSON);
paymentSchema.plugin(paginate);

// Indexes
paymentSchema.index({ user: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paidAt: 1 });
paymentSchema.index({ subscription: 1 });

// Virtual for net amount after fees
paymentSchema.virtual('netAmount').get(function () {
	return this.amount - this.fee.razorpay;
});

// Virtual for is successful
paymentSchema.virtual('isSuccessful').get(function () {
	return this.status === 'captured';
});

// Virtual for is failed
paymentSchema.virtual('isFailed').get(function () {
	return this.status === 'failed';
});

// Virtual for is refunded
paymentSchema.virtual('isRefunded').get(function () {
	return ['refunded', 'partially_refunded'].includes(this.status);
});

class PaymentClass {
	static async getPaymentById(id) {
		return await this.findById(id)
			.populate('user', 'firstName lastName email')
			.populate('subscription', 'razorpaySubscriptionId status');
	}

	static async getPaymentByRazorpayId(razorpayPaymentId) {
		return await this.findOne({ razorpayPaymentId })
			.populate('user', 'firstName lastName email')
			.populate('subscription', 'razorpaySubscriptionId status');
	}

	static async getUserPayments(userId, options = {}) {
		const { page = 1, limit = 10, status, startDate, endDate } = options;
		
		let query = { user: userId };
		
		if (status) {
			query.status = status;
		}
		
		if (startDate || endDate) {
			query.createdAt = {};
			if (startDate) query.createdAt.$gte = new Date(startDate);
			if (endDate) query.createdAt.$lte = new Date(endDate);
		}

		return await this.paginate(query, {
			page: parseInt(page),
			limit: parseInt(limit),
			populate: 'subscription',
			sort: { createdAt: -1 }
		});
	}

	static async getSubscriptionPayments(subscriptionId) {
		return await this.find({ subscription: subscriptionId })
			.populate('user', 'firstName lastName email')
			.sort({ createdAt: -1 });
	}

	static async createPayment(paymentData) {
		// Generate receipt number if not provided
		if (!paymentData.receipt?.number) {
			paymentData.receipt = {
				...paymentData.receipt,
				number: `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
			};
		}

		return await this.create(paymentData);
	}

	static async updatePaymentStatus(paymentId, status, additionalData = {}) {
		const payment = await this.findById(paymentId);
		if (!payment) {
			throw new APIError('Payment not found', httpStatus.NOT_FOUND);
		}

		const oldStatus = payment.status;
		payment.status = status;

		// Update timing based on status
		if (status === 'captured') {
			payment.paidAt = new Date();
		} else if (status === 'failed') {
			payment.failedAt = new Date();
		}

		// Update additional data
		Object.assign(payment, additionalData);

		// Add note about status change
		payment.notes.push({
			content: `Payment status changed from ${oldStatus} to ${status}`,
			createdAt: new Date()
		});

		return await payment.save();
	}

	static async processRefund(paymentId, refundAmount, reason, refundedBy = null) {
		const payment = await this.findById(paymentId);
		if (!payment) {
			throw new APIError('Payment not found', httpStatus.NOT_FOUND);
		}

		if (payment.status !== 'captured') {
			throw new APIError('Only captured payments can be refunded', httpStatus.BAD_REQUEST);
		}

		const currentRefundAmount = payment.refund.amount || 0;
		const totalRefundAmount = currentRefundAmount + refundAmount;

		if (totalRefundAmount > payment.amount) {
			throw new APIError('Refund amount cannot exceed payment amount', httpStatus.BAD_REQUEST);
		}

		// Update refund details
		payment.refund.amount = totalRefundAmount;
		payment.refund.reason = reason;
		payment.refund.refundedAt = new Date();
		payment.refund.razorpayRefundId = `rfnd_${Date.now()}`;

		// Update payment status
		if (totalRefundAmount === payment.amount) {
			payment.status = 'refunded';
		} else {
			payment.status = 'partially_refunded';
		}

		// Add note
		payment.notes.push({
			content: `Refund processed: ₹${refundAmount}. Reason: ${reason}`,
			createdAt: new Date(),
			createdBy: refundedBy
		});

		return await payment.save();
	}

	static async getPaymentStats(options = {}) {
		const { startDate, endDate, user } = options;
		
		let matchQuery = {};
		if (startDate || endDate) {
			matchQuery.createdAt = {};
			if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
			if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
		}
		if (user) {
			matchQuery.user = user;
		}

		const stats = await this.aggregate([
			{ $match: matchQuery },
			{
				$group: {
					_id: '$status',
					count: { $sum: 1 },
					totalAmount: { $sum: '$amount' },
					avgAmount: { $avg: '$amount' }
				}
			}
		]);

		const totalPayments = await this.countDocuments(matchQuery);
		const successfulPayments = await this.countDocuments({ ...matchQuery, status: 'captured' });
		const totalRevenue = await this.aggregate([
			{ $match: { ...matchQuery, status: 'captured' } },
			{ $group: { _id: null, total: { $sum: '$amount' } } }
		]);

		return {
			byStatus: stats,
			totalPayments,
			successfulPayments,
			successRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
			totalRevenue: totalRevenue[0]?.total || 0
		};
	}

	static async getRevenueStats(options = {}) {
		const { startDate, endDate, groupBy = 'day' } = options;
		
		let matchQuery = { status: 'captured' };
		if (startDate || endDate) {
			matchQuery.createdAt = {};
			if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
			if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
		}

		let groupFormat;
		switch (groupBy) {
			case 'hour':
				groupFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' } };
				break;
			case 'day':
				groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
				break;
			case 'month':
				groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
				break;
			case 'year':
				groupFormat = { $dateToString: { format: '%Y', date: '$createdAt' } };
				break;
			default:
				groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
		}

		return await this.aggregate([
			{ $match: matchQuery },
			{
				$group: {
					_id: groupFormat,
					count: { $sum: 1 },
					revenue: { $sum: '$amount' },
					avgAmount: { $avg: '$amount' }
				}
			},
			{ $sort: { _id: 1 } }
		]);
	}

	static async searchPayments(query, options = {}) {
		const { page = 1, limit = 10 } = options;
		const searchRegex = new RegExp(query, 'i');

		const searchQuery = {
			$or: [
				{ razorpayPaymentId: searchRegex },
				{ razorpayOrderId: searchRegex },
				{ description: searchRegex },
				{ 'receipt.number': searchRegex }
			]
		};

		return await this.paginate(searchQuery, {
			page: parseInt(page),
			limit: parseInt(limit),
			populate: [
				{ path: 'user', select: 'firstName lastName email' },
				{ path: 'subscription', select: 'razorpaySubscriptionId status' }
			],
			sort: { createdAt: -1 }
		});
	}

	// Instance method to add note
	async addNote(content, createdBy = null) {
		this.notes.push({
			content,
			createdAt: new Date(),
			createdBy
		});
		return await this.save();
	}

	// Instance method to check if payment is successful
	checkIsSuccessful() {
		return this.status === 'captured';
	}

	// Instance method to get refund amount remaining
	getRefundAmountRemaining() {
		return this.amount - (this.refund.amount || 0);
	}
}

paymentSchema.loadClass(PaymentClass);

const Payment = mongoose.model('payments', paymentSchema);

export default Payment;
