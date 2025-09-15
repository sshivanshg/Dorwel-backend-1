import mongoose from 'mongoose';
import paginate from './plugins/paginatePlugin';
import toJSON from './plugins/toJSONPlugin';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';

const subscriptionSchema = mongoose.Schema(
	{
		user: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'users',
			required: true
		},
		plan: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'subscriptionPlans',
			required: true
		},
		// Razorpay subscription details
		razorpaySubscriptionId: {
			type: String,
			required: true,
			unique: true
		},
		razorpayCustomerId: {
			type: String,
			required: true
		},
		// Subscription status
		status: {
			type: String,
			enum: ['active', 'inactive', 'trialing', 'past_due', 'cancelled', 'paused'],
			default: 'trialing'
		},
		// Billing details
		billingCycle: {
			type: String,
			enum: ['monthly', 'yearly'],
			required: true
		},
		// Pricing
		price: {
			amount: {
				type: Number,
				required: true
			},
			currency: {
				type: String,
				default: 'INR'
			}
		},
		// Trial period
		trial: {
			startDate: {
				type: Date
			},
			endDate: {
				type: Date
			},
			used: {
				type: Boolean,
				default: false
			}
		},
		// Subscription dates
		startDate: {
			type: Date,
			required: true
		},
		endDate: {
			type: Date
		},
		nextBillingDate: {
			type: Date
		},
		cancelledAt: {
			type: Date
		},
		// Payment method
		paymentMethod: {
			type: String,
			enum: ['card', 'netbanking', 'wallet', 'upi', 'emi'],
			default: 'card'
		},
		// Usage tracking
		usage: {
			teams: {
				current: {
					type: Number,
					default: 0
				},
				limit: {
					type: Number,
					default: 1
				}
			},
			users: {
				current: {
					type: Number,
					default: 0
				},
				limit: {
					type: Number,
					default: 5
				}
			},
			projects: {
				current: {
					type: Number,
					default: 0
				},
				limit: {
					type: Number,
					default: 10
				}
			},
			clients: {
				current: {
					type: Number,
					default: 0
				},
				limit: {
					type: Number,
					default: 50
				}
			},
			leads: {
				current: {
					type: Number,
					default: 0
				},
				limit: {
					type: Number,
					default: 100
				}
			},
			storage: {
				current: {
					type: Number, // in GB
					default: 0
				},
				limit: {
					type: Number, // in GB
					default: 5
				}
			}
		},
		// Features access
		features: {
			aiEstimates: {
				type: Boolean,
				default: false
			},
			advancedAnalytics: {
				type: Boolean,
				default: false
			},
			customBranding: {
				type: Boolean,
				default: false
			},
			prioritySupport: {
				type: Boolean,
				default: false
			},
			apiAccess: {
				type: Boolean,
				default: false
			},
			whiteLabel: {
				type: Boolean,
				default: false
			}
		},
		// Subscription history
		history: [{
			action: {
				type: String,
				enum: ['created', 'activated', 'renewed', 'cancelled', 'paused', 'resumed', 'upgraded', 'downgraded'],
				required: true
			},
			date: {
				type: Date,
				default: Date.now
			},
			details: {
				type: String
			},
			metadata: {
				type: mongoose.Schema.Types.Mixed
			}
		}],
		// Auto-renewal settings
		autoRenew: {
			type: Boolean,
			default: true
		},
		// Cancellation details
		cancellation: {
			reason: {
				type: String
			},
			feedback: {
				type: String
			},
			cancelledBy: {
				type: mongoose.SchemaTypes.ObjectId,
				ref: 'users'
			}
		},
		// Proration details for plan changes
		proration: {
			amount: {
				type: Number,
				default: 0
			},
			currency: {
				type: String,
				default: 'INR'
			},
			nextBillingAmount: {
				type: Number
			}
		}
	},
	{
		timestamps: true,
		toJSON: { virtuals: true }
	}
);

subscriptionSchema.plugin(toJSON);
subscriptionSchema.plugin(paginate);

// Indexes
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ razorpaySubscriptionId: 1 });
subscriptionSchema.index({ razorpayCustomerId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ nextBillingDate: 1 });

// Virtual for subscription duration
subscriptionSchema.virtual('duration').get(function () {
	if (!this.endDate) return null;
	return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

// Virtual for days remaining
subscriptionSchema.virtual('daysRemaining').get(function () {
	if (!this.endDate) return null;
	const now = new Date();
	const diffTime = this.endDate - now;
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for is active
subscriptionSchema.virtual('isActive').get(function () {
	return ['active', 'trialing'].includes(this.status);
});

// Virtual for is in trial
subscriptionSchema.virtual('isInTrial').get(function () {
	return this.status === 'trialing' && this.trial.endDate && new Date() < this.trial.endDate;
});

class SubscriptionClass {
	static async getSubscriptionById(id) {
		return await this.findById(id)
			.populate('user', 'firstName lastName email')
			.populate('plan', 'name planType billingCycle price features');
	}

	static async getSubscriptionByRazorpayId(razorpaySubscriptionId) {
		return await this.findOne({ razorpaySubscriptionId })
			.populate('user', 'firstName lastName email')
			.populate('plan', 'name planType billingCycle price features');
	}

	static async getUserActiveSubscription(userId) {
		return await this.findOne({ 
			user: userId, 
			status: { $in: ['active', 'trialing'] } 
		})
			.populate('plan', 'name planType billingCycle price features');
	}

	static async getUserSubscriptions(userId) {
		return await this.find({ user: userId })
			.populate('plan', 'name planType billingCycle price features')
			.sort({ createdAt: -1 });
	}

	static async createSubscription(subscriptionData) {
		// Check if user already has an active subscription
		const existingSubscription = await this.getUserActiveSubscription(subscriptionData.user);
		if (existingSubscription) {
			throw new APIError('User already has an active subscription', httpStatus.BAD_REQUEST);
		}

		// Add creation to history
		subscriptionData.history = [{
			action: 'created',
			date: new Date(),
			details: 'Subscription created'
		}];

		return await this.create(subscriptionData);
	}

	static async updateSubscriptionStatus(subscriptionId, status, details = null) {
		const subscription = await this.findById(subscriptionId);
		if (!subscription) {
			throw new APIError('Subscription not found', httpStatus.NOT_FOUND);
		}

		const oldStatus = subscription.status;
		subscription.status = status;

		// Add to history
		subscription.history.push({
			action: status === 'cancelled' ? 'cancelled' : 'activated',
			date: new Date(),
			details: details || `Status changed from ${oldStatus} to ${status}`
		});

		// Set cancellation date if cancelled
		if (status === 'cancelled') {
			subscription.cancelledAt = new Date();
		}

		return await subscription.save();
	}

	static async cancelSubscription(subscriptionId, reason = null, feedback = null, cancelledBy = null) {
		const subscription = await this.findById(subscriptionId);
		if (!subscription) {
			throw new APIError('Subscription not found', httpStatus.NOT_FOUND);
		}

		subscription.status = 'cancelled';
		subscription.cancelledAt = new Date();
		subscription.cancellation = {
			reason,
			feedback,
			cancelledBy
		};

		subscription.history.push({
			action: 'cancelled',
			date: new Date(),
			details: `Subscription cancelled. Reason: ${reason || 'Not specified'}`
		});

		return await subscription.save();
	}

	static async renewSubscription(subscriptionId, nextBillingDate) {
		const subscription = await this.findById(subscriptionId);
		if (!subscription) {
			throw new APIError('Subscription not found', httpStatus.NOT_FOUND);
		}

		subscription.status = 'active';
		subscription.nextBillingDate = nextBillingDate;
		subscription.endDate = new Date(nextBillingDate.getTime() + (subscription.billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);

		subscription.history.push({
			action: 'renewed',
			date: new Date(),
			details: 'Subscription renewed'
		});

		return await subscription.save();
	}

	static async updateUsage(subscriptionId, resourceType, increment = 1) {
		const subscription = await this.findById(subscriptionId);
		if (!subscription) {
			throw new APIError('Subscription not found', httpStatus.NOT_FOUND);
		}

		if (subscription.usage[resourceType]) {
			subscription.usage[resourceType].current += increment;
			await subscription.save();
		}

		return subscription;
	}

	static async checkUsageLimit(subscriptionId, resourceType) {
		const subscription = await this.findById(subscriptionId);
		if (!subscription) {
			return { allowed: false, reason: 'Subscription not found' };
		}

		const resource = subscription.usage[resourceType];
		if (!resource) {
			return { allowed: false, reason: 'Resource type not found' };
		}

		// Check if unlimited
		if (resource.limit === -1) {
			return { allowed: true, reason: 'Unlimited' };
		}

		// Check if within limit
		if (resource.current < resource.limit) {
			return { allowed: true, reason: 'Within limit' };
		}

		return { 
			allowed: false, 
			reason: 'Usage limit exceeded',
			current: resource.current,
			limit: resource.limit
		};
	}

	static async getSubscriptionStats() {
		const stats = await this.aggregate([
			{
				$group: {
					_id: '$status',
					count: { $sum: 1 },
					totalRevenue: { $sum: '$price.amount' }
				}
			}
		]);

		const totalSubscriptions = await this.countDocuments();
		const activeSubscriptions = await this.countDocuments({ status: { $in: ['active', 'trialing'] } });
		const totalRevenue = await this.aggregate([
			{ $group: { _id: null, total: { $sum: '$price.amount' } } }
		]);

		return {
			byStatus: stats,
			totalSubscriptions,
			activeSubscriptions,
			totalRevenue: totalRevenue[0]?.total || 0
		};
	}

	static async getExpiringSubscriptions(days = 7) {
		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + days);

		return await this.find({
			status: { $in: ['active', 'trialing'] },
			nextBillingDate: { $lte: futureDate }
		})
			.populate('user', 'firstName lastName email')
			.populate('plan', 'name planType billingCycle price');
	}

	// Instance method to check if user can access a feature
	canAccessFeature(featureName) {
		return this.features[featureName] === true;
	}

	// Instance method to check usage limit
	canCreateResource(resourceType) {
		const resource = this.usage[resourceType];
		if (!resource) return false;
		
		if (resource.limit === -1) return true; // Unlimited
		return resource.current < resource.limit;
	}

	// Instance method to get remaining quota
	getRemainingQuota(resourceType) {
		const resource = this.usage[resourceType];
		if (!resource) return 0;
		
		if (resource.limit === -1) return -1; // Unlimited
		return Math.max(0, resource.limit - resource.current);
	}
}

subscriptionSchema.loadClass(SubscriptionClass);

const Subscription = mongoose.model('subscriptions', subscriptionSchema);

export default Subscription;
