import Joi from 'joi';

const createNotification = {
	body: Joi.object().keys({
		title: Joi.string().required().trim(),
		message: Joi.string().required().trim(),
		type: Joi.string().valid('info', 'success', 'warning', 'error', 'project_update', 'estimate_ready', 'moodboard_shared', 'milestone_completed', 'payment_received', 'client_message').required(),
		recipient: Joi.string().hex().length(24).required(),
		sender: Joi.string().hex().length(24).allow(null),
		relatedEntity: Joi.object().keys({
			type: Joi.string().valid('project', 'estimate', 'moodboard', 'lead', 'client', 'milestone').required(),
			id: Joi.string().hex().length(24).required()
		}).allow(null),
		priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
		channels: Joi.array().items(Joi.string().valid('email', 'push', 'sms', 'whatsapp', 'in_app')).default(['in_app']),
		metadata: Joi.object().keys({
			actionUrl: Joi.string().uri().trim().allow(''),
			actionText: Joi.string().trim().allow(''),
			imageUrl: Joi.string().uri().trim().allow(''),
			expiresAt: Joi.date().allow(null)
		}).allow(null)
	})
};

const createBulkNotifications = {
	body: Joi.object().keys({
		notifications: Joi.array().items(Joi.object().keys({
			title: Joi.string().required().trim(),
			message: Joi.string().required().trim(),
			type: Joi.string().valid('info', 'success', 'warning', 'error', 'project_update', 'estimate_ready', 'moodboard_shared', 'milestone_completed', 'payment_received', 'client_message').required(),
			recipient: Joi.string().hex().length(24).required(),
			sender: Joi.string().hex().length(24).allow(null),
			relatedEntity: Joi.object().keys({
				type: Joi.string().valid('project', 'estimate', 'moodboard', 'lead', 'client', 'milestone').required(),
				id: Joi.string().hex().length(24).required()
			}).allow(null),
			priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
			channels: Joi.array().items(Joi.string().valid('email', 'push', 'sms', 'whatsapp', 'in_app')).default(['in_app']),
			metadata: Joi.object().keys({
				actionUrl: Joi.string().uri().trim().allow(''),
				actionText: Joi.string().trim().allow(''),
				imageUrl: Joi.string().uri().trim().allow(''),
				expiresAt: Joi.date().allow(null)
			}).allow(null)
		})).min(1).required()
	})
};

const updateNotification = {
	params: Joi.object().keys({
		notificationId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		title: Joi.string().trim(),
		message: Joi.string().trim(),
		type: Joi.string().valid('info', 'success', 'warning', 'error', 'project_update', 'estimate_ready', 'moodboard_shared', 'milestone_completed', 'payment_received', 'client_message'),
		priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
		channels: Joi.array().items(Joi.string().valid('email', 'push', 'sms', 'whatsapp', 'in_app')),
		metadata: Joi.object().keys({
			actionUrl: Joi.string().uri().trim().allow(''),
			actionText: Joi.string().trim().allow(''),
			imageUrl: Joi.string().uri().trim().allow(''),
			expiresAt: Joi.date().allow(null)
		})
	}).min(1)
};

const markNotificationsAsRead = {
	body: Joi.object().keys({
		notificationIds: Joi.array().items(Joi.string().hex().length(24)).min(1).required()
	})
};

const archiveNotifications = {
	body: Joi.object().keys({
		notificationIds: Joi.array().items(Joi.string().hex().length(24)).min(1).required()
	})
};

export default {
	createNotification,
	createBulkNotifications,
	updateNotification,
	markNotificationsAsRead,
	archiveNotifications
};
