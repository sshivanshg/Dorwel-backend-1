import mongoose from 'mongoose';
import paginate from './plugins/paginatePlugin';
import toJSON from './plugins/toJSONPlugin';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';

const notificationSchema = mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
			trim: true
		},
		message: {
			type: String,
			required: true,
			trim: true
		},
		type: {
			type: String,
			required: true,
			enum: ['info', 'success', 'warning', 'error', 'project_update', 'estimate_ready', 'moodboard_shared', 'milestone_completed', 'payment_received', 'client_message']
		},
		recipient: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'users',
			required: true
		},
		sender: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'users'
		},
		relatedEntity: {
			type: {
				type: String,
				enum: ['project', 'estimate', 'moodboard', 'lead', 'client', 'milestone']
			},
			id: {
				type: mongoose.SchemaTypes.ObjectId
			}
		},
		status: {
			type: String,
			enum: ['unread', 'read', 'archived'],
			default: 'unread'
		},
		priority: {
			type: String,
			enum: ['low', 'medium', 'high', 'urgent'],
			default: 'medium'
		},
		channels: [{
			type: String,
			enum: ['email', 'push', 'sms', 'whatsapp', 'in_app'],
			default: ['in_app']
		}],
		metadata: {
			actionUrl: {
				type: String,
				trim: true
			},
			actionText: {
				type: String,
				trim: true
			},
			imageUrl: {
				type: String,
				trim: true
			},
			expiresAt: {
				type: Date
			}
		},
		readAt: {
			type: Date
		},
		archivedAt: {
			type: Date
		}
	},
	{
		timestamps: true,
		toJSON: { virtuals: true }
	}
);

notificationSchema.plugin(toJSON);
notificationSchema.plugin(paginate);

notificationSchema.virtual('isExpired').get(function () {
	if (!this.metadata.expiresAt) return false;
	return new Date() > this.metadata.expiresAt;
});

class NotificationClass {
	static async getNotificationsByUser(userId, options = {}) {
		const query = { recipient: userId };
		
		if (options.status) {
			query.status = options.status;
		}
		
		if (options.type) {
			query.type = options.type;
		}

		return await this.find(query)
			.populate('sender', 'firstName lastName email avatar')
			.sort({ createdAt: -1 })
			.limit(options.limit || 50);
	}

	static async getUnreadCount(userId) {
		return await this.countDocuments({ 
			recipient: userId, 
			status: 'unread' 
		});
	}

	static async markAsRead(notificationId, userId) {
		const notification = await this.findOne({ 
			_id: notificationId, 
			recipient: userId 
		});
		
		if (!notification) {
			throw new APIError('Notification not found', httpStatus.NOT_FOUND);
		}

		notification.status = 'read';
		notification.readAt = new Date();

		return await notification.save();
	}

	static async markAllAsRead(userId) {
		return await this.updateMany(
			{ recipient: userId, status: 'unread' },
			{ 
				status: 'read', 
				readAt: new Date() 
			}
		);
	}

	static async archive(notificationId, userId) {
		const notification = await this.findOne({ 
			_id: notificationId, 
			recipient: userId 
		});
		
		if (!notification) {
			throw new APIError('Notification not found', httpStatus.NOT_FOUND);
		}

		notification.status = 'archived';
		notification.archivedAt = new Date();

		return await notification.save();
	}

	static async createNotification(notificationData) {
		return await this.create(notificationData);
	}

	static async createBulkNotifications(notifications) {
		return await this.insertMany(notifications);
	}

	static async getNotificationStats(userId) {
		const stats = await this.aggregate([
			{ $match: { recipient: userId } },
			{
				$group: {
					_id: '$status',
					count: { $sum: 1 }
				}
			}
		]);

		const totalNotifications = await this.countDocuments({ recipient: userId });
		const unreadCount = await this.countDocuments({ 
			recipient: userId, 
			status: 'unread' 
		});

		return {
			byStatus: stats,
			totalNotifications,
			unreadCount
		};
	}

	static async cleanupExpired() {
		return await this.deleteMany({
			'metadata.expiresAt': { $lt: new Date() }
		});
	}
}

notificationSchema.loadClass(NotificationClass);

const Notification = mongoose.model('notifications', notificationSchema);

export default Notification;
