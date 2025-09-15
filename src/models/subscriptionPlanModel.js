import mongoose from 'mongoose';
import paginate from './plugins/paginatePlugin';
import toJSON from './plugins/toJSONPlugin';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';

const subscriptionPlanSchema = mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true
		},
		description: {
			type: String,
			trim: true
		},
		planType: {
			type: String,
			enum: ['basic', 'professional', 'enterprise', 'custom'],
			required: true
		},
		billingCycle: {
			type: String,
			enum: ['monthly', 'yearly'],
			required: true
		},
		price: {
			amount: {
				type: Number,
				required: true,
				min: 0
			},
			currency: {
				type: String,
				default: 'INR',
				enum: ['INR', 'USD', 'EUR']
			}
		},
		// Features and limits
		features: {
			teams: {
				max: {
					type: Number,
					default: 1
				},
				unlimited: {
					type: Boolean,
					default: false
				}
			},
			users: {
				max: {
					type: Number,
					default: 5
				},
				unlimited: {
					type: Boolean,
					default: false
				}
			},
			projects: {
				max: {
					type: Number,
					default: 10
				},
				unlimited: {
					type: Boolean,
					default: false
				}
			},
			clients: {
				max: {
					type: Number,
					default: 50
				},
				unlimited: {
					type: Boolean,
					default: false
				}
			},
			leads: {
				max: {
					type: Number,
					default: 100
				},
				unlimited: {
					type: Boolean,
					default: false
				}
			},
			storage: {
				max: {
					type: Number, // in GB
					default: 5
				},
				unlimited: {
					type: Boolean,
					default: false
				}
			},
			// Feature flags
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
			}
		},
		// Razorpay integration
		razorpayPlanId: {
			type: String,
			required: true,
			unique: true
		},
		// Plan status
		status: {
			type: String,
			enum: ['active', 'inactive', 'archived'],
			default: 'active'
		},
		// Trial period
		trialPeriod: {
			enabled: {
				type: Boolean,
				default: false
			},
			days: {
				type: Number,
				default: 14
			}
		},
		// Discounts
		discounts: {
			yearlyDiscount: {
				type: Number,
				default: 0,
				min: 0,
				max: 100
			}
		},
		// Plan metadata
		popular: {
			type: Boolean,
			default: false
		},
		sortOrder: {
			type: Number,
			default: 0
		},
		tags: [{
			type: String,
			trim: true
		}]
	},
	{
		timestamps: true,
		toJSON: { virtuals: true }
	}
);

subscriptionPlanSchema.plugin(toJSON);
subscriptionPlanSchema.plugin(paginate);

// Indexes
subscriptionPlanSchema.index({ planType: 1, billingCycle: 1 });
subscriptionPlanSchema.index({ status: 1 });
subscriptionPlanSchema.index({ razorpayPlanId: 1 });

// Virtual for yearly price with discount
subscriptionPlanSchema.virtual('yearlyPrice').get(function () {
	if (this.billingCycle === 'yearly') {
		const discount = this.discounts.yearlyDiscount / 100;
		return {
			amount: Math.round(this.price.amount * 12 * (1 - discount)),
			currency: this.price.currency
		};
	}
	return null;
});

// Virtual for monthly equivalent of yearly plan
subscriptionPlanSchema.virtual('monthlyEquivalent').get(function () {
	if (this.billingCycle === 'yearly') {
		const discount = this.discounts.yearlyDiscount / 100;
		return {
			amount: Math.round((this.price.amount * (1 - discount))),
			currency: this.price.currency
		};
	}
	return this.price;
});

class SubscriptionPlanClass {
	static async getPlanById(id) {
		return await this.findById(id);
	}

	static async getPlanByRazorpayId(razorpayPlanId) {
		return await this.findOne({ razorpayPlanId });
	}

	static async getActivePlans() {
		return await this.find({ status: 'active' })
			.sort({ sortOrder: 1, createdAt: 1 });
	}

	static async getPlansByType(planType) {
		return await this.find({ planType, status: 'active' })
			.sort({ sortOrder: 1, createdAt: 1 });
	}

	static async getPlansByBillingCycle(billingCycle) {
		return await this.find({ billingCycle, status: 'active' })
			.sort({ sortOrder: 1, createdAt: 1 });
	}

	static async createPlan(planData) {
		// Validate that razorpayPlanId is unique
		const existingPlan = await this.findOne({ razorpayPlanId: planData.razorpayPlanId });
		if (existingPlan) {
			throw new APIError('Plan with this Razorpay ID already exists', httpStatus.BAD_REQUEST);
		}

		return await this.create(planData);
	}

	static async updatePlan(planId, updateData) {
		const plan = await this.findById(planId);
		if (!plan) {
			throw new APIError('Plan not found', httpStatus.NOT_FOUND);
		}

		// If updating razorpayPlanId, check uniqueness
		if (updateData.razorpayPlanId && updateData.razorpayPlanId !== plan.razorpayPlanId) {
			const existingPlan = await this.findOne({ razorpayPlanId: updateData.razorpayPlanId });
			if (existingPlan) {
				throw new APIError('Plan with this Razorpay ID already exists', httpStatus.BAD_REQUEST);
			}
		}

		Object.assign(plan, updateData);
		return await plan.save();
	}

	static async deletePlan(planId) {
		const plan = await this.findById(planId);
		if (!plan) {
			throw new APIError('Plan not found', httpStatus.NOT_FOUND);
		}

		// Check if plan is being used by any subscriptions
		const Subscription = mongoose.model('subscriptions');
		const activeSubscriptions = await Subscription.countDocuments({ 
			plan: planId, 
			status: { $in: ['active', 'trialing'] } 
		});

		if (activeSubscriptions > 0) {
			throw new APIError('Cannot delete plan with active subscriptions', httpStatus.BAD_REQUEST);
		}

		return await plan.remove();
	}

	static async getPlanStats() {
		const stats = await this.aggregate([
			{
				$group: {
					_id: '$planType',
					count: { $sum: 1 },
					avgPrice: { $avg: '$price.amount' }
				}
			}
		]);

		const totalPlans = await this.countDocuments();
		const activePlans = await this.countDocuments({ status: 'active' });

		return {
			byType: stats,
			totalPlans,
			activePlans
		};
	}

	static async searchPlans(query) {
		const searchRegex = new RegExp(query, 'i');
		return await this.find({
			$or: [
				{ name: searchRegex },
				{ description: searchRegex },
				{ tags: { $in: [searchRegex] } }
			]
		}).sort({ sortOrder: 1, createdAt: 1 });
	}

	// Method to check if plan supports a feature
	hasFeature(featureName) {
		return this.features.features[featureName] === true;
	}

	// Method to get limit for a resource
	getLimit(resourceName) {
		const resource = this.features[resourceName];
		if (!resource) return 0;
		return resource.unlimited ? -1 : resource.max;
	}

	// Method to check if resource is unlimited
	isUnlimited(resourceName) {
		const resource = this.features[resourceName];
		return resource ? resource.unlimited : false;
	}
}

subscriptionPlanSchema.loadClass(SubscriptionPlanClass);

const SubscriptionPlan = mongoose.model('subscriptionPlans', subscriptionPlanSchema);

export default SubscriptionPlan;
