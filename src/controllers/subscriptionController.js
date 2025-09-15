import httpStatus from 'http-status';
import catchAsync from '~/utils/catchAsync';
import APIError from '~/utils/apiError';
import SubscriptionPlan from '~/models/subscriptionPlanModel';
import Subscription from '~/models/subscriptionModel';
import Payment from '~/models/paymentModel';
import User from '~/models/userModel';
import razorpayService from '~/services/razorpayService';
import Notification from '~/models/notificationModel';

// Subscription Plan Management
const createPlan = catchAsync(async (req, res) => {
	// Create plan in Razorpay first
	const razorpayPlan = await razorpayService.createPlan(req.body);
	
	// Create plan in database
	const planData = {
		...req.body,
		razorpayPlanId: razorpayPlan.id
	};
	
	const plan = await SubscriptionPlan.createPlan(planData);

	res.status(httpStatus.CREATED).json({
		success: true,
		message: 'Subscription plan created successfully',
		data: plan
	});
});

const getPlans = catchAsync(async (req, res) => {
	const { planType, billingCycle, status, search, page = 1, limit = 10 } = req.query;
	
	let query = {};
	
	if (planType) query.planType = planType;
	if (billingCycle) query.billingCycle = billingCycle;
	if (status) query.status = status;
	
	if (search) {
		const searchRegex = new RegExp(search, 'i');
		query.$or = [
			{ name: searchRegex },
			{ description: searchRegex },
			{ tags: { $in: [searchRegex] } }
		];
	}

	const plans = await SubscriptionPlan.paginate(query, {
		page: parseInt(page),
		limit: parseInt(limit),
		sort: { sortOrder: 1, createdAt: 1 }
	});

	res.json({
		success: true,
		data: plans
	});
});

const getPlan = catchAsync(async (req, res) => {
	const plan = await SubscriptionPlan.getPlanById(req.params.planId);
	
	if (!plan) {
		throw new APIError('Plan not found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		data: plan
	});
});

const updatePlan = catchAsync(async (req, res) => {
	const plan = await SubscriptionPlan.updatePlan(req.params.planId, req.body);

	res.json({
		success: true,
		message: 'Plan updated successfully',
		data: plan
	});
});

const deletePlan = catchAsync(async (req, res) => {
	await SubscriptionPlan.deletePlan(req.params.planId);

	res.json({
		success: true,
		message: 'Plan deleted successfully'
	});
});

// Subscription Management
const createSubscription = catchAsync(async (req, res) => {
	const { planId, paymentMethod } = req.body;
	
	// Get plan details
	const plan = await SubscriptionPlan.getPlanById(planId);
	if (!plan) {
		throw new APIError('Plan not found', httpStatus.NOT_FOUND);
	}

	// Check if user already has active subscription
	const existingSubscription = await Subscription.getUserActiveSubscription(req.user.id);
	if (existingSubscription) {
		throw new APIError('User already has an active subscription', httpStatus.BAD_REQUEST);
	}

	// Get or create Razorpay customer
	let customerId = req.user.razorpayCustomerId;
	if (!customerId) {
		const customer = await razorpayService.createCustomer({
			userId: req.user.id,
			firstName: req.user.firstName,
			lastName: req.user.lastName,
			email: req.user.email,
			phone: req.user.phone || ''
		});
		customerId = customer.id;
		
		// Update user with customer ID
		req.user.razorpayCustomerId = customerId;
		await req.user.save();
	}

	// Create subscription in Razorpay
	const razorpaySubscription = await razorpayService.createSubscription({
		planId: plan.razorpayPlanId,
		customerId,
		startAt: plan.trialPeriod.enabled ? Math.floor(Date.now() / 1000) + (plan.trialPeriod.days * 24 * 60 * 60) : Math.floor(Date.now() / 1000),
		notes: {
			user_id: req.user.id,
			plan_name: plan.name
		}
	});

	// Create subscription in database
	const subscriptionData = {
		user: req.user.id,
		plan: planId,
		razorpaySubscriptionId: razorpaySubscription.id,
		razorpayCustomerId: customerId,
		billingCycle: plan.billingCycle,
		price: plan.price,
		startDate: new Date(),
		endDate: new Date(Date.now() + (plan.billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
		nextBillingDate: new Date(Date.now() + (plan.billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
		paymentMethod,
		status: plan.trialPeriod.enabled ? 'trialing' : 'active',
		usage: {
			teams: { current: 0, limit: plan.features.teams.unlimited ? -1 : plan.features.teams.max },
			users: { current: 0, limit: plan.features.users.unlimited ? -1 : plan.features.users.max },
			projects: { current: 0, limit: plan.features.projects.unlimited ? -1 : plan.features.projects.max },
			clients: { current: 0, limit: plan.features.clients.unlimited ? -1 : plan.features.clients.max },
			leads: { current: 0, limit: plan.features.leads.unlimited ? -1 : plan.features.leads.max },
			storage: { current: 0, limit: plan.features.storage.unlimited ? -1 : plan.features.storage.max }
		},
		features: plan.features.features,
		trial: plan.trialPeriod.enabled ? {
			startDate: new Date(),
			endDate: new Date(Date.now() + plan.trialPeriod.days * 24 * 60 * 60 * 1000),
			used: true
		} : null
	};

	const subscription = await Subscription.createSubscription(subscriptionData);

	// Create notification
	await Notification.createNotification({
		title: 'Subscription Created',
		message: `Your ${plan.name} subscription has been created successfully`,
		type: 'success',
		recipient: req.user.id,
		relatedEntity: {
			type: 'subscription',
			id: subscription._id
		},
		priority: 'high'
	});

	res.status(httpStatus.CREATED).json({
		success: true,
		message: 'Subscription created successfully',
		data: {
			subscription,
			razorpaySubscription
		}
	});
});

const getUserSubscriptions = catchAsync(async (req, res) => {
	const subscriptions = await Subscription.getUserSubscriptions(req.user.id);

	res.json({
		success: true,
		data: subscriptions
	});
});

const getActiveSubscription = catchAsync(async (req, res) => {
	const subscription = await Subscription.getUserActiveSubscription(req.user.id);
	
	if (!subscription) {
		throw new APIError('No active subscription found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		data: subscription
	});
});

const cancelSubscription = catchAsync(async (req, res) => {
	const { reason, feedback } = req.body;
	
	const subscription = await Subscription.getSubscriptionById(req.params.subscriptionId);
	if (!subscription) {
		throw new APIError('Subscription not found', httpStatus.NOT_FOUND);
	}

	// Check if user owns this subscription
	if (subscription.user._id.toString() !== req.user.id) {
		throw new APIError('Unauthorized access to subscription', httpStatus.FORBIDDEN);
	}

	// Cancel in Razorpay
	await razorpayService.cancelSubscription(subscription.razorpaySubscriptionId);

	// Cancel in database
	await Subscription.cancelSubscription(req.params.subscriptionId, reason, feedback, req.user.id);

	// Create notification
	await Notification.createNotification({
		title: 'Subscription Cancelled',
		message: 'Your subscription has been cancelled successfully',
		type: 'warning',
		recipient: req.user.id,
		relatedEntity: {
			type: 'subscription',
			id: subscription._id
		},
		priority: 'medium'
	});

	res.json({
		success: true,
		message: 'Subscription cancelled successfully'
	});
});

// Payment Management
const createPaymentOrder = catchAsync(async (req, res) => {
	const { planId, amount, currency = 'INR' } = req.body;
	
	// Get plan details
	const plan = await SubscriptionPlan.getPlanById(planId);
	if (!plan) {
		throw new APIError('Plan not found', httpStatus.NOT_FOUND);
	}

	// Create order in Razorpay
	const order = await razorpayService.createOrder({
		amount: amount || plan.price.amount,
		currency,
		receipt: `order_${Date.now()}_${req.user.id}`,
		notes: {
			user_id: req.user.id,
			plan_id: planId,
			plan_name: plan.name
		}
	});

	res.json({
		success: true,
		message: 'Payment order created successfully',
		data: {
			order,
			key: process.env.RAZORPAY_KEY_ID
		}
	});
});

const verifyPayment = catchAsync(async (req, res) => {
	const { orderId, paymentId, signature, planId } = req.body;
	
	// Verify payment signature
	const isValidSignature = razorpayService.verifyPaymentSignature(orderId, paymentId, signature);
	if (!isValidSignature) {
		throw new APIError('Invalid payment signature', httpStatus.BAD_REQUEST);
	}

	// Get payment details from Razorpay
	const razorpayPayment = await razorpayService.getPayment(paymentId);
	
	// Create payment record
	const paymentData = {
		user: req.user.id,
		razorpayPaymentId: paymentId,
		razorpayOrderId: orderId,
		razorpaySignature: signature,
		amount: razorpayPayment.amount / 100, // Convert from paise
		currency: razorpayPayment.currency,
		status: razorpayPayment.status === 'captured' ? 'captured' : 'failed',
		paymentMethod: {
			type: razorpayPayment.method,
			card: razorpayPayment.card ? {
				last4: razorpayPayment.card.last4,
				network: razorpayPayment.card.network,
				type: razorpayPayment.card.type
			} : undefined
		},
		paidAt: razorpayPayment.status === 'captured' ? new Date(razorpayPayment.created_at * 1000) : null,
		description: `Payment for subscription plan`,
		receipt: {
			number: `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
		}
	};

	const payment = await Payment.createPayment(paymentData);

	// If payment is successful and planId is provided, create subscription
	if (razorpayPayment.status === 'captured' && planId) {
		// Create subscription logic here (similar to createSubscription)
		// This would be called after successful payment
	}

	res.json({
		success: true,
		message: 'Payment verified successfully',
		data: payment
	});
});

const getUserPayments = catchAsync(async (req, res) => {
	const { page = 1, limit = 10, status, startDate, endDate } = req.query;
	
	const payments = await Payment.getUserPayments(req.user.id, {
		page: parseInt(page),
		limit: parseInt(limit),
		status,
		startDate,
		endDate
	});

	res.json({
		success: true,
		data: payments
	});
});

const getPayment = catchAsync(async (req, res) => {
	const payment = await Payment.getPaymentById(req.params.paymentId);
	
	if (!payment) {
		throw new APIError('Payment not found', httpStatus.NOT_FOUND);
	}

	// Check if user owns this payment
	if (payment.user._id.toString() !== req.user.id) {
		throw new APIError('Unauthorized access to payment', httpStatus.FORBIDDEN);
	}

	res.json({
		success: true,
		data: payment
	});
});

// Usage and Limits
const checkUsageLimit = catchAsync(async (req, res) => {
	const { resourceType } = req.params;
	
	const subscription = await Subscription.getUserActiveSubscription(req.user.id);
	if (!subscription) {
		throw new APIError('No active subscription found', httpStatus.NOT_FOUND);
	}

	const usageCheck = await Subscription.checkUsageLimit(subscription._id, resourceType);

	res.json({
		success: true,
		data: usageCheck
	});
});

const getUsageStats = catchAsync(async (req, res) => {
	const subscription = await Subscription.getUserActiveSubscription(req.user.id);
	if (!subscription) {
		throw new APIError('No active subscription found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		data: {
			usage: subscription.usage,
			features: subscription.features,
			plan: subscription.plan
		}
	});
});

// Admin Functions
const getAllSubscriptions = catchAsync(async (req, res) => {
	const { status, page = 1, limit = 10 } = req.query;
	
	let query = {};
	if (status) query.status = status;

	const subscriptions = await Subscription.paginate(query, {
		page: parseInt(page),
		limit: parseInt(limit),
		populate: [
			{ path: 'user', select: 'firstName lastName email' },
			{ path: 'plan', select: 'name planType billingCycle price' }
		],
		sort: { createdAt: -1 }
	});

	res.json({
		success: true,
		data: subscriptions
	});
});

const getSubscriptionStats = catchAsync(async (req, res) => {
	const stats = await Subscription.getSubscriptionStats();

	res.json({
		success: true,
		data: stats
	});
});

const getPaymentStats = catchAsync(async (req, res) => {
	const { startDate, endDate } = req.query;
	
	const stats = await Payment.getPaymentStats({
		startDate,
		endDate
	});

	res.json({
		success: true,
		data: stats
	});
});

export default {
	// Plan Management
	createPlan,
	getPlans,
	getPlan,
	updatePlan,
	deletePlan,
	
	// Subscription Management
	createSubscription,
	getUserSubscriptions,
	getActiveSubscription,
	cancelSubscription,
	
	// Payment Management
	createPaymentOrder,
	verifyPayment,
	getUserPayments,
	getPayment,
	
	// Usage and Limits
	checkUsageLimit,
	getUsageStats,
	
	// Admin Functions
	getAllSubscriptions,
	getSubscriptionStats,
	getPaymentStats
};
