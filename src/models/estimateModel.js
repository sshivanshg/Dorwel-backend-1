import mongoose from 'mongoose';
import paginate from './plugins/paginatePlugin';
import toJSON from './plugins/toJSONPlugin';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';

const estimateSchema = mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
			trim: true
		},
		description: {
			type: String,
			required: true,
			trim: true
		},
		client: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'clients',
			required: true
		},
		project: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'projects'
		},
		lead: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'leads'
		},
		status: {
			type: String,
			enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised'],
			default: 'draft'
		},
		version: {
			type: Number,
			default: 1
		},
		parentEstimate: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'estimates'
		},
		items: [{
			category: {
				type: String,
				required: true,
				enum: ['design', 'materials', 'labor', 'furniture', 'lighting', 'decor', 'installation', 'other']
			},
			name: {
				type: String,
				required: true,
				trim: true
			},
			description: {
				type: String,
				trim: true
			},
			quantity: {
				type: Number,
				required: true,
				min: 0
			},
			unit: {
				type: String,
				required: true,
				enum: ['each', 'sqft', 'sqm', 'linear_ft', 'hour', 'day', 'week', 'month', 'other']
			},
			unitPrice: {
				type: Number,
				required: true,
				min: 0
			},
			totalPrice: {
				type: Number,
				required: true,
				min: 0
			},
			notes: {
				type: String,
				trim: true
			},
			isAIGenerated: {
				type: Boolean,
				default: false
			}
		}],
		pricing: {
			subtotal: {
				type: Number,
				required: true,
				min: 0
			},
			taxRate: {
				type: Number,
				default: 0,
				min: 0,
				max: 100
			},
			taxAmount: {
				type: Number,
				default: 0,
				min: 0
			},
			discountRate: {
				type: Number,
				default: 0,
				min: 0,
				max: 100
			},
			discountAmount: {
				type: Number,
				default: 0,
				min: 0
			},
			totalAmount: {
				type: Number,
				required: true,
				min: 0
			},
			currency: {
				type: String,
				default: 'USD'
			}
		},
		validity: {
			validUntil: {
				type: Date,
				required: true
			},
			daysValid: {
				type: Number,
				default: 30
			}
		},
		terms: {
			paymentTerms: {
				type: String,
				default: 'Net 30'
			},
			depositRequired: {
				type: Number,
				default: 0,
				min: 0,
				max: 100
			},
			depositAmount: {
				type: Number,
				default: 0,
				min: 0
			},
			additionalTerms: {
				type: String,
				trim: true
			}
		},
		aiGeneration: {
			enabled: {
				type: Boolean,
				default: false
			},
			prompt: {
				type: String,
				trim: true
			},
			model: {
				type: String,
				default: 'gpt-4'
			},
			confidence: {
				type: Number,
				min: 0,
				max: 1
			},
			generatedAt: {
				type: Date
			}
		},
		attachments: [{
			name: {
				type: String,
				required: true
			},
			type: {
				type: String,
				required: true,
				enum: ['image', 'pdf', 'document', 'other']
			},
			url: {
				type: String,
				required: true
			},
			uploadedBy: {
				type: mongoose.SchemaTypes.ObjectId,
				ref: 'users',
				required: true
			},
			uploadedAt: {
				type: Date,
				default: Date.now
			},
			size: {
				type: Number
			}
		}],
		notes: [{
			content: {
				type: String,
				required: true
			},
			createdBy: {
				type: mongoose.SchemaTypes.ObjectId,
				ref: 'users',
				required: true
			},
			createdAt: {
				type: Date,
				default: Date.now
			}
		}],
		createdBy: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'users',
			required: true
		},
		sentAt: {
			type: Date
		},
		viewedAt: {
			type: Date
		},
		respondedAt: {
			type: Date
		},
		clientResponse: {
			status: {
				type: String,
				enum: ['accepted', 'rejected', 'needs_revision']
			},
			comments: {
				type: String,
				trim: true
			},
			respondedAt: {
				type: Date
			}
		}
	},
	{
		timestamps: true,
		toJSON: { virtuals: true }
	}
);

estimateSchema.plugin(toJSON);
estimateSchema.plugin(paginate);

estimateSchema.virtual('isExpired').get(function () {
	return new Date() > this.validity.validUntil;
});

estimateSchema.virtual('daysUntilExpiry').get(function () {
	const now = new Date();
	const diffTime = this.validity.validUntil - now;
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

estimateSchema.virtual('formattedTotal').get(function () {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: this.pricing.currency
	}).format(this.pricing.totalAmount);
});

class EstimateClass {
	static async getEstimateById(id) {
		return await this.findById(id)
			.populate('client', 'firstName lastName email phone company')
			.populate('project', 'name description status')
			.populate('lead', 'firstName lastName email projectType')
			.populate('createdBy', 'firstName lastName email avatar');
	}

	static async getEstimatesByClient(clientId) {
		return await this.find({ client: clientId })
			.populate('project', 'name description status')
			.populate('createdBy', 'firstName lastName email avatar')
			.sort({ createdAt: -1 });
	}

	static async getEstimatesByStatus(status) {
		return await this.find({ status })
			.populate('client', 'firstName lastName email phone company')
			.populate('project', 'name description status')
			.populate('createdBy', 'firstName lastName email avatar');
	}

	static async getEstimatesByCreator(userId) {
		return await this.find({ createdBy: userId })
			.populate('client', 'firstName lastName email phone company')
			.populate('project', 'name description status')
			.sort({ createdAt: -1 });
	}

	static async searchEstimates(query) {
		const searchRegex = new RegExp(query, 'i');
		return await this.find({
			$or: [
				{ title: searchRegex },
				{ description: searchRegex },
				{ 'items.name': searchRegex },
				{ 'items.description': searchRegex }
			]
		})
			.populate('client', 'firstName lastName email phone company')
			.populate('project', 'name description status')
			.populate('createdBy', 'firstName lastName email avatar');
	}

	static async updateEstimateStatus(estimateId, status, userId) {
		const estimate = await this.findById(estimateId);
		if (!estimate) {
			throw new APIError('Estimate not found', httpStatus.NOT_FOUND);
		}

		estimate.status = status;
		
		if (status === 'sent') {
			estimate.sentAt = new Date();
		} else if (status === 'viewed') {
			estimate.viewedAt = new Date();
		} else if (['accepted', 'rejected'].includes(status)) {
			estimate.respondedAt = new Date();
		}

		// Add status change note
		estimate.notes.push({
			content: `Status changed to ${status}`,
			createdBy: userId
		});

		return await estimate.save();
	}

	static async addNote(estimateId, content, userId) {
		const estimate = await this.findById(estimateId);
		if (!estimate) {
			throw new APIError('Estimate not found', httpStatus.NOT_FOUND);
		}

		estimate.notes.push({
			content,
			createdBy: userId
		});

		return await estimate.save();
	}

	static async createRevision(originalEstimateId, updateData, userId) {
		const originalEstimate = await this.findById(originalEstimateId);
		if (!originalEstimate) {
			throw new APIError('Original estimate not found', httpStatus.NOT_FOUND);
		}

		const revisionData = {
			...originalEstimate.toObject(),
			...updateData,
			_id: new mongoose.Types.ObjectId(),
			version: originalEstimate.version + 1,
			parentEstimate: originalEstimateId,
			status: 'draft',
			createdBy: userId,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		delete revisionData.__v;

		return await this.create(revisionData);
	}

	static async calculateTotals(estimateId) {
		const estimate = await this.findById(estimateId);
		if (!estimate) {
			throw new APIError('Estimate not found', httpStatus.NOT_FOUND);
		}

		// Calculate subtotal
		const subtotal = estimate.items.reduce((sum, item) => {
			item.totalPrice = item.quantity * item.unitPrice;
			return sum + item.totalPrice;
		}, 0);

		// Calculate tax
		const taxAmount = (subtotal * estimate.pricing.taxRate) / 100;

		// Calculate discount
		const discountAmount = (subtotal * estimate.pricing.discountRate) / 100;

		// Calculate total
		const totalAmount = subtotal + taxAmount - discountAmount;

		// Update pricing
		estimate.pricing.subtotal = subtotal;
		estimate.pricing.taxAmount = taxAmount;
		estimate.pricing.discountAmount = discountAmount;
		estimate.pricing.totalAmount = totalAmount;

		// Update deposit amount if percentage is set
		if (estimate.terms.depositRequired > 0) {
			estimate.terms.depositAmount = (totalAmount * estimate.terms.depositRequired) / 100;
		}

		return await estimate.save();
	}

	static async getEstimateStats() {
		const stats = await this.aggregate([
			{
				$group: {
					_id: '$status',
					count: { $sum: 1 },
					totalValue: { $sum: '$pricing.totalAmount' }
				}
			}
		]);

		const totalEstimates = await this.countDocuments();
		const acceptedEstimates = await this.countDocuments({ status: 'accepted' });
		const totalValue = await this.aggregate([
			{ $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } }
		]);

		return {
			byStatus: stats,
			totalEstimates,
			acceptedEstimates,
			acceptanceRate: totalEstimates > 0 ? (acceptedEstimates / totalEstimates) * 100 : 0,
			totalValue: totalValue[0]?.total || 0
		};
	}
}

estimateSchema.loadClass(EstimateClass);

// Pre-save middleware to calculate totals
estimateSchema.pre('save', function (next) {
	if (this.isModified('items') || this.isModified('pricing.taxRate') || this.isModified('pricing.discountRate')) {
		// Calculate subtotal
		this.pricing.subtotal = this.items.reduce((sum, item) => {
			item.totalPrice = item.quantity * item.unitPrice;
			return sum + item.totalPrice;
		}, 0);

		// Calculate tax
		this.pricing.taxAmount = (this.pricing.subtotal * this.pricing.taxRate) / 100;

		// Calculate discount
		this.pricing.discountAmount = (this.pricing.subtotal * this.pricing.discountRate) / 100;

		// Calculate total
		this.pricing.totalAmount = this.pricing.subtotal + this.pricing.taxAmount - this.pricing.discountAmount;

		// Update deposit amount if percentage is set
		if (this.terms.depositRequired > 0) {
			this.terms.depositAmount = (this.pricing.totalAmount * this.terms.depositRequired) / 100;
		}
	}
	next();
});

const Estimate = mongoose.model('estimates', estimateSchema);

export default Estimate;
