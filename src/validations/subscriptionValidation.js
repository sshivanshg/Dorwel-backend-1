import Joi from 'joi';

const createPlan = {
	body: Joi.object().keys({
		name: Joi.string().required().trim().min(2).max(100),
		description: Joi.string().trim().max(500).allow(''),
		planType: Joi.string().valid('basic', 'professional', 'enterprise', 'custom').required(),
		billingCycle: Joi.string().valid('monthly', 'yearly').required(),
		price: Joi.object().keys({
			amount: Joi.number().required().min(0),
			currency: Joi.string().valid('INR', 'USD', 'EUR').default('INR')
		}).required(),
		features: Joi.object().keys({
			teams: Joi.object().keys({
				max: Joi.number().default(1),
				unlimited: Joi.boolean().default(false)
			}),
			users: Joi.object().keys({
				max: Joi.number().default(5),
				unlimited: Joi.boolean().default(false)
			}),
			projects: Joi.object().keys({
				max: Joi.number().default(10),
				unlimited: Joi.boolean().default(false)
			}),
			clients: Joi.object().keys({
				max: Joi.number().default(50),
				unlimited: Joi.boolean().default(false)
			}),
			leads: Joi.object().keys({
				max: Joi.number().default(100),
				unlimited: Joi.boolean().default(false)
			}),
			storage: Joi.object().keys({
				max: Joi.number().default(5),
				unlimited: Joi.boolean().default(false)
			}),
			features: Joi.object().keys({
				aiEstimates: Joi.boolean().default(false),
				advancedAnalytics: Joi.boolean().default(false),
				customBranding: Joi.boolean().default(false),
				prioritySupport: Joi.boolean().default(false),
				apiAccess: Joi.boolean().default(false),
				whiteLabel: Joi.boolean().default(false)
			})
		}),
		status: Joi.string().valid('active', 'inactive', 'archived').default('active'),
		trialPeriod: Joi.object().keys({
			enabled: Joi.boolean().default(false),
			days: Joi.number().default(14)
		}),
		discounts: Joi.object().keys({
			yearlyDiscount: Joi.number().min(0).max(100).default(0)
		}),
		popular: Joi.boolean().default(false),
		sortOrder: Joi.number().default(0),
		tags: Joi.array().items(Joi.string().trim().max(50))
	})
};

const updatePlan = {
	params: Joi.object().keys({
		planId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		name: Joi.string().trim().min(2).max(100),
		description: Joi.string().trim().max(500).allow(''),
		planType: Joi.string().valid('basic', 'professional', 'enterprise', 'custom'),
		billingCycle: Joi.string().valid('monthly', 'yearly'),
		price: Joi.object().keys({
			amount: Joi.number().min(0),
			currency: Joi.string().valid('INR', 'USD', 'EUR')
		}),
		features: Joi.object().keys({
			teams: Joi.object().keys({
				max: Joi.number(),
				unlimited: Joi.boolean()
			}),
			users: Joi.object().keys({
				max: Joi.number(),
				unlimited: Joi.boolean()
			}),
			projects: Joi.object().keys({
				max: Joi.number(),
				unlimited: Joi.boolean()
			}),
			clients: Joi.object().keys({
				max: Joi.number(),
				unlimited: Joi.boolean()
			}),
			leads: Joi.object().keys({
				max: Joi.number(),
				unlimited: Joi.boolean()
			}),
			storage: Joi.object().keys({
				max: Joi.number(),
				unlimited: Joi.boolean()
			}),
			features: Joi.object().keys({
				aiEstimates: Joi.boolean(),
				advancedAnalytics: Joi.boolean(),
				customBranding: Joi.boolean(),
				prioritySupport: Joi.boolean(),
				apiAccess: Joi.boolean(),
				whiteLabel: Joi.boolean()
			})
		}),
		status: Joi.string().valid('active', 'inactive', 'archived'),
		trialPeriod: Joi.object().keys({
			enabled: Joi.boolean(),
			days: Joi.number()
		}),
		discounts: Joi.object().keys({
			yearlyDiscount: Joi.number().min(0).max(100)
		}),
		popular: Joi.boolean(),
		sortOrder: Joi.number(),
		tags: Joi.array().items(Joi.string().trim().max(50))
	}).min(1)
};

const createSubscription = {
	body: Joi.object().keys({
		planId: Joi.string().hex().length(24).required(),
		paymentMethod: Joi.string().valid('card', 'netbanking', 'wallet', 'upi', 'emi').default('card')
	})
};

const cancelSubscription = {
	params: Joi.object().keys({
		subscriptionId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		reason: Joi.string().trim().max(500).allow(''),
		feedback: Joi.string().trim().max(1000).allow('')
	})
};

const createPaymentOrder = {
	body: Joi.object().keys({
		planId: Joi.string().hex().length(24).required(),
		amount: Joi.number().min(0),
		currency: Joi.string().valid('INR', 'USD', 'EUR').default('INR')
	})
};

const verifyPayment = {
	body: Joi.object().keys({
		orderId: Joi.string().required(),
		paymentId: Joi.string().required(),
		signature: Joi.string().required(),
		planId: Joi.string().hex().length(24)
	})
};

const getUserPayments = {
	query: Joi.object().keys({
		page: Joi.number().integer().min(1).default(1),
		limit: Joi.number().integer().min(1).max(100).default(10),
		status: Joi.string().valid('pending', 'captured', 'failed', 'refunded', 'partially_refunded'),
		startDate: Joi.date().iso(),
		endDate: Joi.date().iso()
	})
};

const getPayment = {
	params: Joi.object().keys({
		paymentId: Joi.string().hex().length(24).required()
	})
};

const checkUsageLimit = {
	params: Joi.object().keys({
		resourceType: Joi.string().valid('teams', 'users', 'projects', 'clients', 'leads', 'storage').required()
	})
};

const getUsageStats = {
	query: Joi.object().keys({
		startDate: Joi.date().iso(),
		endDate: Joi.date().iso()
	})
};

const getAllSubscriptions = {
	query: Joi.object().keys({
		page: Joi.number().integer().min(1).default(1),
		limit: Joi.number().integer().min(1).max(100).default(10),
		status: Joi.string().valid('active', 'inactive', 'trialing', 'past_due', 'cancelled', 'paused')
	})
};

const getSubscriptionStats = {
	query: Joi.object().keys({
		startDate: Joi.date().iso(),
		endDate: Joi.date().iso()
	})
};

const getPaymentStats = {
	query: Joi.object().keys({
		startDate: Joi.date().iso(),
		endDate: Joi.date().iso()
	})
};

export default {
	createPlan,
	updatePlan,
	createSubscription,
	cancelSubscription,
	createPaymentOrder,
	verifyPayment,
	getUserPayments,
	getPayment,
	checkUsageLimit,
	getUsageStats,
	getAllSubscriptions,
	getSubscriptionStats,
	getPaymentStats
};
