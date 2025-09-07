import { Router } from 'express';
import notificationController from '~/controllers/notificationController';
import authenticate from '~/middlewares/authenticate';
import validate from '~/middlewares/validate';
import notificationValidation from '~/validations/notificationValidation';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Notification CRUD operations
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/stats', notificationController.getNotificationStats);
router.get('/recent', notificationController.getRecentNotifications);
router.get('/type/:type', notificationController.getNotificationsByType);
router.get('/status/:status', notificationController.getNotificationsByStatus);
router.get('/:notificationId', notificationController.getNotification);
router.put('/:notificationId', validate(notificationValidation.updateNotification), notificationController.updateNotification);
router.delete('/:notificationId', notificationController.deleteNotification);

// Notification actions
router.patch('/:notificationId/read', notificationController.markAsRead);
router.patch('/:notificationId/archive', notificationController.archiveNotification);
router.patch('/mark-all-read', notificationController.markAllAsRead);
router.patch('/mark-multiple-read', validate(notificationValidation.markNotificationsAsRead), notificationController.markNotificationsAsRead);
router.patch('/archive-multiple', validate(notificationValidation.archiveNotifications), notificationController.archiveNotifications);

// Admin operations
router.post('/', validate(notificationValidation.createNotification), notificationController.createNotification);
router.post('/bulk', validate(notificationValidation.createBulkNotifications), notificationController.createBulkNotifications);
router.post('/cleanup-expired', notificationController.cleanupExpiredNotifications);

export default router;
