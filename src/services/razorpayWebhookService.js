import razorpayService from './razorpayService';
import Subscription from '~/models/subscriptionModel';
import Payment from '~/models/paymentModel';
import User from '~/models/userModel';
import Notification from '~/models/notificationModel';
import logger from '~/config/logger';

class RazorpayWebhookService {
	// Handle all Razorpay webhook events
	async handleWebhook(event, data) {
		logger.info(`Razorpay webhook received: ${event}`, data);

		try {
			switch (event) {
				case 'payment.captured':
					await this.handlePaymentCaptured(data);
					break;
				case 'payment.failed':
					await this.handlePaymentFailed(data);
					break;
				case 'subscription.activated':
					await this.handleSubscriptionActivated(data);
					break;
				case 'subscription.charged':
					await this.handleSubscriptionCharged(data);
					break;
				case 'subscription.completed':
					await this.handleSubscriptionCompleted(data);
					break;
				case 'subscription.cancelled':
					await this.handleSubscriptionCancelled(data);
					break;
				case 'subscription.paused':
					await this.handleSubscriptionPaused(data);
					break;
				case 'subscription.resumed':
					await this.handleSubscriptionResumed(data);
					break;
				case 'subscription.halted':
					await this.handleSubscriptionHalted(data);
					break;
				case 'subscription.pending':
					await this.handleSubscriptionPending(data);
					break;
				case 'subscription.updated':
					await this.handleSubscriptionUpdated(data);
					break;
				default:
					logger.warn(`Unhandled Razorpay webhook event: ${event}`);
			}
		} catch (error) {
			logger.error(`Error handling Razorpay webhook ${event}:`, error);
			throw error;
		}
	}

	// Payment captured
	async handlePaymentCaptured(data) {
		const { payment } = data;
		
		// Update payment status
		const paymentRecord = await Payment.findOne({ razorpayPaymentId: payment.id });
		if (paymentRecord) {
			await Payment.updatePaymentStatus(paymentRecord._id, 'captured', {
				paidAt: new Date(payment.created_at * 1000),
				paymentMethod: {
					type: payment.method,
					card: payment.card ? {
						last4: payment.card.last4,
						network: payment.card.network,
						type: payment.card.type
					} : undefined
				}
			});

			// Add note
			await paymentRecord.addNote('Payment captured successfully');

			// Create notification for user
			await Notification.createNotification({
				title: 'Payment Successful',
				message: `Your payment of ₹${payment.amount / 100} has been processed successfully`,
				type: 'success',
				recipient: paymentRecord.user,
				relatedEntity: {
					type: 'payment',
					id: paymentRecord._id
				},
				priority: 'high'
			});
		}
	}

	// Payment failed
	async handlePaymentFailed(data) {
		const { payment } = data;
		
		// Update payment status
		const paymentRecord = await Payment.findOne({ razorpayPaymentId: payment.id });
		if (paymentRecord) {
			await Payment.updatePaymentStatus(paymentRecord._id, 'failed', {
				failedAt: new Date(payment.created_at * 1000),
				error: {
					code: payment.error_code,
					description: payment.error_description,
					source: payment.error_source,
					step: payment.error_step,
					reason: payment.error_reason
				}
			});

			// Add note
			await paymentRecord.addNote(`Payment failed: ${payment.error_description}`);

			// Create notification for user
			await Notification.createNotification({
				title: 'Payment Failed',
				message: `Your payment of ₹${payment.amount / 100} failed. Please try again.`,
				type: 'error',
				recipient: paymentRecord.user,
				relatedEntity: {
					type: 'payment',
					id: paymentRecord._id
				},
				priority: 'high'
			});
		}
	}

	// Subscription activated
	async handleSubscriptionActivated(data) {
		const { subscription } = data;
		
		// Update subscription status
		const subscriptionRecord = await Subscription.findOne({ 
			razorpaySubscriptionId: subscription.id 
		});
		
		if (subscriptionRecord) {
			await Subscription.updateSubscriptionStatus(subscriptionRecord._id, 'active');
			
			// Update user subscription status
			await User.updateSubscriptionStatus(
				subscriptionRecord.user,
				'active',
				new Date(subscription.current_end * 1000)
			);

			// Add to history
			subscriptionRecord.history.push({
				action: 'activated',
				date: new Date(),
				details: 'Subscription activated'
			});
			await subscriptionRecord.save();

			// Create notification
			await Notification.createNotification({
				title: 'Subscription Activated',
				message: 'Your subscription has been activated successfully',
				type: 'success',
				recipient: subscriptionRecord.user,
				relatedEntity: {
					type: 'subscription',
					id: subscriptionRecord._id
				},
				priority: 'high'
			});
		}
	}

	// Subscription charged (recurring payment)
	async handleSubscriptionCharged(data) {
		const { subscription, payment } = data;
		
		// Update subscription
		const subscriptionRecord = await Subscription.findOne({ 
			razorpaySubscriptionId: subscription.id 
		});
		
		if (subscriptionRecord) {
			// Update next billing date
			subscriptionRecord.nextBillingDate = new Date(subscription.current_end * 1000);
			subscriptionRecord.endDate = new Date(subscription.current_end * 1000);
			
			// Add to history
			subscriptionRecord.history.push({
				action: 'renewed',
				date: new Date(),
				details: `Subscription renewed. Payment: ₹${payment.amount / 100}`
			});
			await subscriptionRecord.save();

			// Update user subscription expiry
			await User.updateSubscriptionStatus(
				subscriptionRecord.user,
				'active',
				new Date(subscription.current_end * 1000)
			);

			// Create payment record if not exists
			const existingPayment = await Payment.findOne({ razorpayPaymentId: payment.id });
			if (!existingPayment) {
				await Payment.createPayment({
					user: subscriptionRecord.user,
					subscription: subscriptionRecord._id,
					razorpayPaymentId: payment.id,
					razorpayOrderId: payment.order_id,
					amount: payment.amount / 100,
					currency: payment.currency,
					status: 'captured',
					paymentMethod: {
						type: payment.method
					},
					paidAt: new Date(payment.created_at * 1000),
					description: 'Recurring subscription payment'
				});
			}

			// Create notification
			await Notification.createNotification({
				title: 'Subscription Renewed',
				message: `Your subscription has been renewed. Payment of ₹${payment.amount / 100} processed.`,
				type: 'success',
				recipient: subscriptionRecord.user,
				relatedEntity: {
					type: 'subscription',
					id: subscriptionRecord._id
				},
				priority: 'medium'
			});
		}
	}

	// Subscription completed
	async handleSubscriptionCompleted(data) {
		const { subscription } = data;
		
		const subscriptionRecord = await Subscription.findOne({ 
			razorpaySubscriptionId: subscription.id 
		});
		
		if (subscriptionRecord) {
			await Subscription.updateSubscriptionStatus(subscriptionRecord._id, 'completed');
			
			// Update user subscription status
			await User.updateSubscriptionStatus(subscriptionRecord.user, 'expired');

			// Add to history
			subscriptionRecord.history.push({
				action: 'completed',
				date: new Date(),
				details: 'Subscription completed'
			});
			await subscriptionRecord.save();

			// Create notification
			await Notification.createNotification({
				title: 'Subscription Completed',
				message: 'Your subscription has completed. Please renew to continue using premium features.',
				type: 'warning',
				recipient: subscriptionRecord.user,
				relatedEntity: {
					type: 'subscription',
					id: subscriptionRecord._id
				},
				priority: 'high'
			});
		}
	}

	// Subscription cancelled
	async handleSubscriptionCancelled(data) {
		const { subscription } = data;
		
		const subscriptionRecord = await Subscription.findOne({ 
			razorpaySubscriptionId: subscription.id 
		});
		
		if (subscriptionRecord) {
			await Subscription.updateSubscriptionStatus(subscriptionRecord._id, 'cancelled');
			
			// Update user subscription status
			await User.updateSubscriptionStatus(subscriptionRecord.user, 'cancelled');

			// Add to history
			subscriptionRecord.history.push({
				action: 'cancelled',
				date: new Date(),
				details: 'Subscription cancelled via Razorpay'
			});
			await subscriptionRecord.save();

			// Create notification
			await Notification.createNotification({
				title: 'Subscription Cancelled',
				message: 'Your subscription has been cancelled. You can still use the service until the current billing period ends.',
				type: 'warning',
				recipient: subscriptionRecord.user,
				relatedEntity: {
					type: 'subscription',
					id: subscriptionRecord._id
				},
				priority: 'medium'
			});
		}
	}

	// Subscription paused
	async handleSubscriptionPaused(data) {
		const { subscription } = data;
		
		const subscriptionRecord = await Subscription.findOne({ 
			razorpaySubscriptionId: subscription.id 
		});
		
		if (subscriptionRecord) {
			await Subscription.updateSubscriptionStatus(subscriptionRecord._id, 'paused');

			// Add to history
			subscriptionRecord.history.push({
				action: 'paused',
				date: new Date(),
				details: 'Subscription paused'
			});
			await subscriptionRecord.save();

			// Create notification
			await Notification.createNotification({
				title: 'Subscription Paused',
				message: 'Your subscription has been paused. You can resume it anytime.',
				type: 'info',
				recipient: subscriptionRecord.user,
				relatedEntity: {
					type: 'subscription',
					id: subscriptionRecord._id
				},
				priority: 'medium'
			});
		}
	}

	// Subscription resumed
	async handleSubscriptionResumed(data) {
		const { subscription } = data;
		
		const subscriptionRecord = await Subscription.findOne({ 
			razorpaySubscriptionId: subscription.id 
		});
		
		if (subscriptionRecord) {
			await Subscription.updateSubscriptionStatus(subscriptionRecord._id, 'active');
			
			// Update user subscription status
			await User.updateSubscriptionStatus(
				subscriptionRecord.user,
				'active',
				new Date(subscription.current_end * 1000)
			);

			// Add to history
			subscriptionRecord.history.push({
				action: 'resumed',
				date: new Date(),
				details: 'Subscription resumed'
			});
			await subscriptionRecord.save();

			// Create notification
			await Notification.createNotification({
				title: 'Subscription Resumed',
				message: 'Your subscription has been resumed successfully.',
				type: 'success',
				recipient: subscriptionRecord.user,
				relatedEntity: {
					type: 'subscription',
					id: subscriptionRecord._id
				},
				priority: 'medium'
			});
		}
	}

	// Subscription halted (payment failed)
	async handleSubscriptionHalted(data) {
		const { subscription } = data;
		
		const subscriptionRecord = await Subscription.findOne({ 
			razorpaySubscriptionId: subscription.id 
		});
		
		if (subscriptionRecord) {
			await Subscription.updateSubscriptionStatus(subscriptionRecord._id, 'past_due');

			// Add to history
			subscriptionRecord.history.push({
				action: 'halted',
				date: new Date(),
				details: 'Subscription halted due to payment failure'
			});
			await subscriptionRecord.save();

			// Create notification
			await Notification.createNotification({
				title: 'Payment Failed - Subscription Halted',
				message: 'Your subscription has been halted due to payment failure. Please update your payment method.',
				type: 'error',
				recipient: subscriptionRecord.user,
				relatedEntity: {
					type: 'subscription',
					id: subscriptionRecord._id
				},
				priority: 'high'
			});
		}
	}

	// Subscription pending
	async handleSubscriptionPending(data) {
		const { subscription } = data;
		
		const subscriptionRecord = await Subscription.findOne({ 
			razorpaySubscriptionId: subscription.id 
		});
		
		if (subscriptionRecord) {
			await Subscription.updateSubscriptionStatus(subscriptionRecord._id, 'trialing');

			// Add to history
			subscriptionRecord.history.push({
				action: 'pending',
				date: new Date(),
				details: 'Subscription pending activation'
			});
			await subscriptionRecord.save();
		}
	}

	// Subscription updated
	async handleSubscriptionUpdated(data) {
		const { subscription } = data;
		
		const subscriptionRecord = await Subscription.findOne({ 
			razorpaySubscriptionId: subscription.id 
		});
		
		if (subscriptionRecord) {
			// Update subscription details
			subscriptionRecord.nextBillingDate = new Date(subscription.current_end * 1000);
			subscriptionRecord.endDate = new Date(subscription.current_end * 1000);
			
			// Add to history
			subscriptionRecord.history.push({
				action: 'updated',
				date: new Date(),
				details: 'Subscription updated'
			});
			await subscriptionRecord.save();

			// Update user subscription expiry
			await User.updateSubscriptionStatus(
				subscriptionRecord.user,
				'active',
				new Date(subscription.current_end * 1000)
			);
		}
	}

	// Health check
	async healthCheck() {
		try {
			// Test webhook processing
			return { status: 'healthy', service: 'razorpay-webhook' };
		} catch (error) {
			logger.error('Razorpay webhook health check failed:', error);
			return { status: 'unhealthy', service: 'razorpay-webhook', error: error.message };
		}
	}
}

export default new RazorpayWebhookService();
