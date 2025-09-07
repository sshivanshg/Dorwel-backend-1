import httpStatus from 'http-status';
import catchAsync from '~/utils/catchAsync';
import APIError from '~/utils/apiError';
import Notification from '~/models/notificationModel';

const getNotifications = catchAsync(async (req, res) => {
	const { status, type, page = 1, limit = 20 } = req.query;
	
	const options = {
		status,
		type
	};

	const notifications = await Notification.getNotificationsByUser(req.user.id, {
		...options,
		limit: parseInt(limit)
	});

	res.json({
		success: true,
		data: notifications
	});
});

const getUnreadCount = catchAsync(async (req, res) => {
	const count = await Notification.getUnreadCount(req.user.id);

	res.json({
		success: true,
		data: { unreadCount: count }
	});
});

const markAsRead = catchAsync(async (req, res) => {
	const notification = await Notification.markAsRead(req.params.notificationId, req.user.id);

	res.json({
		success: true,
		message: 'Notification marked as read',
		data: notification
	});
});

const markAllAsRead = catchAsync(async (req, res) => {
	await Notification.markAllAsRead(req.user.id);

	res.json({
		success: true,
		message: 'All notifications marked as read'
	});
});

const archiveNotification = catchAsync(async (req, res) => {
	const notification = await Notification.archive(req.params.notificationId, req.user.id);

	res.json({
		success: true,
		message: 'Notification archived',
		data: notification
	});
});

const getNotificationStats = catchAsync(async (req, res) => {
	const stats = await Notification.getNotificationStats(req.user.id);

	res.json({
		success: true,
		data: stats
	});
});

const createNotification = catchAsync(async (req, res) => {
	const notification = await Notification.createNotification(req.body);

	res.status(httpStatus.CREATED).json({
		success: true,
		message: 'Notification created successfully',
		data: notification
	});
});

const createBulkNotifications = catchAsync(async (req, res) => {
	const { notifications } = req.body;
	
	const createdNotifications = await Notification.createBulkNotifications(notifications);

	res.status(httpStatus.CREATED).json({
		success: true,
		message: 'Notifications created successfully',
		data: createdNotifications
	});
});

const deleteNotification = catchAsync(async (req, res) => {
	const notification = await Notification.findOneAndDelete({
		_id: req.params.notificationId,
		recipient: req.user.id
	});

	if (!notification) {
		throw new APIError('Notification not found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		message: 'Notification deleted successfully'
	});
});

const getNotification = catchAsync(async (req, res) => {
	const notification = await Notification.findOne({
		_id: req.params.notificationId,
		recipient: req.user.id
	}).populate('sender', 'firstName lastName email avatar');

	if (!notification) {
		throw new APIError('Notification not found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		data: notification
	});
});

const updateNotification = catchAsync(async (req, res) => {
	const notification = await Notification.findOneAndUpdate(
		{
			_id: req.params.notificationId,
			recipient: req.user.id
		},
		req.body,
		{ new: true, runValidators: true }
	);

	if (!notification) {
		throw new APIError('Notification not found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		message: 'Notification updated successfully',
		data: notification
	});
});

const cleanupExpiredNotifications = catchAsync(async (req, res) => {
	const result = await Notification.cleanupExpired();

	res.json({
		success: true,
		message: 'Expired notifications cleaned up',
		data: { deletedCount: result.deletedCount }
	});
});

const getNotificationsByType = catchAsync(async (req, res) => {
	const { type } = req.params;
	const { page = 1, limit = 20 } = req.query;
	
	const notifications = await Notification.getNotificationsByUser(req.user.id, {
		type,
		limit: parseInt(limit)
	});

	res.json({
		success: true,
		data: notifications
	});
});

const getNotificationsByStatus = catchAsync(async (req, res) => {
	const { status } = req.params;
	const { page = 1, limit = 20 } = req.query;
	
	const notifications = await Notification.getNotificationsByUser(req.user.id, {
		status,
		limit: parseInt(limit)
	});

	res.json({
		success: true,
		data: notifications
	});
});

const markNotificationsAsRead = catchAsync(async (req, res) => {
	const { notificationIds } = req.body;
	
	const result = await Notification.updateMany(
		{
			_id: { $in: notificationIds },
			recipient: req.user.id,
			status: 'unread'
		},
		{
			status: 'read',
			readAt: new Date()
		}
	);

	res.json({
		success: true,
		message: 'Notifications marked as read',
		data: { modifiedCount: result.modifiedCount }
	});
});

const archiveNotifications = catchAsync(async (req, res) => {
	const { notificationIds } = req.body;
	
	const result = await Notification.updateMany(
		{
			_id: { $in: notificationIds },
			recipient: req.user.id
		},
		{
			status: 'archived',
			archivedAt: new Date()
		}
	);

	res.json({
		success: true,
		message: 'Notifications archived',
		data: { modifiedCount: result.modifiedCount }
	});
});

const getRecentNotifications = catchAsync(async (req, res) => {
	const { limit = 10 } = req.query;
	
	const notifications = await Notification.getNotificationsByUser(req.user.id, {
		limit: parseInt(limit)
	});

	res.json({
		success: true,
		data: notifications
	});
});

export default {
	getNotifications,
	getUnreadCount,
	markAsRead,
	markAllAsRead,
	archiveNotification,
	getNotificationStats,
	createNotification,
	createBulkNotifications,
	deleteNotification,
	getNotification,
	updateNotification,
	cleanupExpiredNotifications,
	getNotificationsByType,
	getNotificationsByStatus,
	markNotificationsAsRead,
	archiveNotifications,
	getRecentNotifications
};
