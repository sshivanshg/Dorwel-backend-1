import Razorpay from 'razorpay';
import crypto from 'crypto';
import config from '~/config/config';
import logger from '~/config/logger';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';

class RazorpayService {
	constructor() {
		this.razorpay = new Razorpay({
			key_id: config.RAZORPAY_KEY_ID,
			key_secret: config.RAZORPAY_KEY_SECRET
		});
	}

	// Create a Razorpay customer
	async createCustomer(customerData) {
		try {
			const customer = await this.razorpay.customers.create({
				name: `${customerData.firstName} ${customerData.lastName}`,
				email: customerData.email,
				contact: customerData.phone,
				notes: {
					user_id: customerData.userId,
					created_via: 'subscription'
				}
			});

			logger.info(`Razorpay customer created: ${customer.id}`);
			return customer;
		} catch (error) {
			logger.error('Error creating Razorpay customer:', error);
			throw new APIError('Failed to create customer', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Create a Razorpay order
	async createOrder(orderData) {
		try {
			const order = await this.razorpay.orders.create({
				amount: orderData.amount * 100, // Convert to paise
				currency: orderData.currency || 'INR',
				receipt: orderData.receipt,
				notes: orderData.notes || {},
				payment_capture: 1 // Auto capture payment
			});

			logger.info(`Razorpay order created: ${order.id}`);
			return order;
		} catch (error) {
			logger.error('Error creating Razorpay order:', error);
			throw new APIError('Failed to create order', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Create a subscription plan in Razorpay
	async createPlan(planData) {
		try {
			const plan = await this.razorpay.plans.create({
				period: planData.billingCycle === 'yearly' ? 'yearly' : 'monthly',
				interval: 1,
				item: {
					name: planData.name,
					description: planData.description,
					amount: planData.price.amount * 100, // Convert to paise
					currency: planData.price.currency || 'INR'
				},
				notes: {
					plan_type: planData.planType,
					features: JSON.stringify(planData.features)
				}
			});

			logger.info(`Razorpay plan created: ${plan.id}`);
			return plan;
		} catch (error) {
			logger.error('Error creating Razorpay plan:', error);
			throw new APIError('Failed to create plan', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Create a subscription in Razorpay
	async createSubscription(subscriptionData) {
		try {
			const subscription = await this.razorpay.subscriptions.create({
				plan_id: subscriptionData.planId,
				customer_id: subscriptionData.customerId,
				total_count: subscriptionData.totalCount || 12, // Default 12 months
				quantity: 1,
				start_at: subscriptionData.startAt || Math.floor(Date.now() / 1000),
				expire_by: subscriptionData.expireBy,
				notes: subscriptionData.notes || {}
			});

			logger.info(`Razorpay subscription created: ${subscription.id}`);
			return subscription;
		} catch (error) {
			logger.error('Error creating Razorpay subscription:', error);
			throw new APIError('Failed to create subscription', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Get subscription details
	async getSubscription(subscriptionId) {
		try {
			const subscription = await this.razorpay.subscriptions.fetch(subscriptionId);
			return subscription;
		} catch (error) {
			logger.error('Error fetching Razorpay subscription:', error);
			throw new APIError('Failed to fetch subscription', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Cancel a subscription
	async cancelSubscription(subscriptionId, cancelAtCycleEnd = false) {
		try {
			const subscription = await this.razorpay.subscriptions.cancel(subscriptionId, {
				cancel_at_cycle_end: cancelAtCycleEnd
			});

			logger.info(`Razorpay subscription cancelled: ${subscriptionId}`);
			return subscription;
		} catch (error) {
			logger.error('Error cancelling Razorpay subscription:', error);
			throw new APIError('Failed to cancel subscription', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Pause a subscription
	async pauseSubscription(subscriptionId, pauseAt) {
		try {
			const subscription = await this.razorpay.subscriptions.pause(subscriptionId, {
				pause_at: pauseAt
			});

			logger.info(`Razorpay subscription paused: ${subscriptionId}`);
			return subscription;
		} catch (error) {
			logger.error('Error pausing Razorpay subscription:', error);
			throw new APIError('Failed to pause subscription', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Resume a subscription
	async resumeSubscription(subscriptionId) {
		try {
			const subscription = await this.razorpay.subscriptions.resume(subscriptionId);

			logger.info(`Razorpay subscription resumed: ${subscriptionId}`);
			return subscription;
		} catch (error) {
			logger.error('Error resuming Razorpay subscription:', error);
			throw new APIError('Failed to resume subscription', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Get payment details
	async getPayment(paymentId) {
		try {
			const payment = await this.razorpay.payments.fetch(paymentId);
			return payment;
		} catch (error) {
			logger.error('Error fetching Razorpay payment:', error);
			throw new APIError('Failed to fetch payment', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Capture payment
	async capturePayment(paymentId, amount) {
		try {
			const payment = await this.razorpay.payments.capture(paymentId, amount * 100); // Convert to paise
			logger.info(`Razorpay payment captured: ${paymentId}`);
			return payment;
		} catch (error) {
			logger.error('Error capturing Razorpay payment:', error);
			throw new APIError('Failed to capture payment', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Create refund
	async createRefund(paymentId, refundData) {
		try {
			const refund = await this.razorpay.payments.refund(paymentId, {
				amount: refundData.amount * 100, // Convert to paise
				notes: refundData.notes || {},
				receipt: refundData.receipt
			});

			logger.info(`Razorpay refund created: ${refund.id}`);
			return refund;
		} catch (error) {
			logger.error('Error creating Razorpay refund:', error);
			throw new APIError('Failed to create refund', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Verify payment signature
	verifyPaymentSignature(orderId, paymentId, signature) {
		try {
			const body = orderId + '|' + paymentId;
			const expectedSignature = crypto
				.createHmac('sha256', config.RAZORPAY_KEY_SECRET)
				.update(body.toString())
				.digest('hex');

			return expectedSignature === signature;
		} catch (error) {
			logger.error('Error verifying payment signature:', error);
			return false;
		}
	}

	// Verify webhook signature
	verifyWebhookSignature(body, signature) {
		try {
			const expectedSignature = crypto
				.createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
				.update(body)
				.digest('hex');

			return expectedSignature === signature;
		} catch (error) {
			logger.error('Error verifying webhook signature:', error);
			return false;
		}
	}

	// Get all subscriptions for a customer
	async getCustomerSubscriptions(customerId) {
		try {
			const subscriptions = await this.razorpay.subscriptions.all({
				customer_id: customerId
			});
			return subscriptions;
		} catch (error) {
			logger.error('Error fetching customer subscriptions:', error);
			throw new APIError('Failed to fetch customer subscriptions', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Get all payments for a subscription
	async getSubscriptionPayments(subscriptionId) {
		try {
			const payments = await this.razorpay.payments.all({
				subscription_id: subscriptionId
			});
			return payments;
		} catch (error) {
			logger.error('Error fetching subscription payments:', error);
			throw new APIError('Failed to fetch subscription payments', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Create addon for subscription
	async createAddon(subscriptionId, addonData) {
		try {
			const addon = await this.razorpay.subscriptions.createAddon(subscriptionId, {
				item: {
					name: addonData.name,
					amount: addonData.amount * 100, // Convert to paise
					currency: addonData.currency || 'INR',
					description: addonData.description
				},
				quantity: addonData.quantity || 1
			});

			logger.info(`Razorpay addon created: ${addon.id}`);
			return addon;
		} catch (error) {
			logger.error('Error creating Razorpay addon:', error);
			throw new APIError('Failed to create addon', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Get plan details
	async getPlan(planId) {
		try {
			const plan = await this.razorpay.plans.fetch(planId);
			return plan;
		} catch (error) {
			logger.error('Error fetching Razorpay plan:', error);
			throw new APIError('Failed to fetch plan', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Update subscription
	async updateSubscription(subscriptionId, updateData) {
		try {
			const subscription = await this.razorpay.subscriptions.update(subscriptionId, updateData);
			logger.info(`Razorpay subscription updated: ${subscriptionId}`);
			return subscription;
		} catch (error) {
			logger.error('Error updating Razorpay subscription:', error);
			throw new APIError('Failed to update subscription', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Get customer details
	async getCustomer(customerId) {
		try {
			const customer = await this.razorpay.customers.fetch(customerId);
			return customer;
		} catch (error) {
			logger.error('Error fetching Razorpay customer:', error);
			throw new APIError('Failed to fetch customer', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Update customer
	async updateCustomer(customerId, customerData) {
		try {
			const customer = await this.razorpay.customers.edit(customerId, customerData);
			logger.info(`Razorpay customer updated: ${customerId}`);
			return customer;
		} catch (error) {
			logger.error('Error updating Razorpay customer:', error);
			throw new APIError('Failed to update customer', httpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// Health check
	async healthCheck() {
		try {
			// Try to fetch plans to check if API is working
			await this.razorpay.plans.all({ count: 1 });
			return { status: 'healthy', service: 'razorpay' };
		} catch (error) {
			logger.error('Razorpay health check failed:', error);
			return { status: 'unhealthy', service: 'razorpay', error: error.message };
		}
	}

	// Get service status
	async isServiceAvailable() {
		try {
			const health = await this.healthCheck();
			return health.status === 'healthy';
		} catch (error) {
			return false;
		}
	}
}

export default new RazorpayService();
