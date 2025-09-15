import { Router } from 'express';
import subscriptionController from '~/controllers/subscriptionController';
import authenticate from '~/middlewares/authenticate';
import validate from '~/middlewares/validate';
import subscriptionValidation from '~/validations/subscriptionValidation';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Subscription Plan Management (Admin only - requires subscription:create permission)
router.post('/plans', authenticate('subscription:create'), validate(subscriptionValidation.createPlan), subscriptionController.createPlan);
router.get('/plans', subscriptionController.getPlans);
router.get('/plans/:planId', subscriptionController.getPlan);
router.put('/plans/:planId', authenticate('subscription:update'), validate(subscriptionValidation.updatePlan), subscriptionController.updatePlan);
router.delete('/plans/:planId', authenticate('subscription:delete'), subscriptionController.deletePlan);

// Subscription Management
router.post('/subscribe', validate(subscriptionValidation.createSubscription), subscriptionController.createSubscription);
router.get('/my-subscriptions', subscriptionController.getUserSubscriptions);
router.get('/active', subscriptionController.getActiveSubscription);
router.post('/:subscriptionId/cancel', validate(subscriptionValidation.cancelSubscription), subscriptionController.cancelSubscription);

// Payment Management
router.post('/payment/order', validate(subscriptionValidation.createPaymentOrder), subscriptionController.createPaymentOrder);
router.post('/payment/verify', validate(subscriptionValidation.verifyPayment), subscriptionController.verifyPayment);
router.get('/payments', subscriptionController.getUserPayments);
router.get('/payments/:paymentId', subscriptionController.getPayment);

// Usage and Limits
router.get('/usage/:resourceType', subscriptionController.checkUsageLimit);
router.get('/usage', subscriptionController.getUsageStats);

// Admin Functions (requires subscription:read permission)
router.get('/admin/subscriptions', authenticate('subscription:read'), subscriptionController.getAllSubscriptions);
router.get('/admin/stats', authenticate('subscription:read'), subscriptionController.getSubscriptionStats);
router.get('/admin/payment-stats', authenticate('subscription:read'), subscriptionController.getPaymentStats);

export default router;
