import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '~/config/config';
import logger from '~/config/logger';
import User from '~/models/userModel';

class RealtimeService {
	constructor() {
		this.io = null;
		this.connectedUsers = new Map();
		this.userRooms = new Map();
	}

	initialize(server) {
		this.io = new Server(server, {
			cors: {
				origin: config.FRONTEND_URL,
				methods: ['GET', 'POST'],
				credentials: true
			}
		});

		this.setupMiddleware();
		this.setupEventHandlers();
		
		logger.info('Realtime service initialized');
	}

	setupMiddleware() {
		// Authentication middleware
		this.io.use(async (socket, next) => {
			try {
				const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
				
				if (!token) {
					return next(new Error('Authentication token required'));
				}

				const decoded = jwt.verify(token, config.JWT_ACCESS_TOKEN_SECRET_PUBLIC);
				const user = await User.findById(decoded.sub).select('-password');
				
				if (!user) {
					return next(new Error('User not found'));
				}

				socket.user = user;
				next();
			} catch (error) {
				logger.error('Socket authentication error:', error);
				next(new Error('Authentication failed'));
			}
		});
	}

	setupEventHandlers() {
		this.io.on('connection', (socket) => {
			const user = socket.user;
			logger.info(`User connected: ${user.firstName} ${user.lastName} (${socket.id})`);

			// Store user connection
			this.connectedUsers.set(user._id.toString(), {
				socketId: socket.id,
				user,
				connectedAt: new Date()
			});

			// Join user to their personal room
			socket.join(`user:${user._id}`);
			this.userRooms.set(user._id.toString(), `user:${user._id}`);

			// Handle joining project rooms
			socket.on('join-project', (projectId) => {
				socket.join(`project:${projectId}`);
				logger.info(`User ${user.firstName} joined project room: ${projectId}`);
			});

			// Handle leaving project rooms
			socket.on('leave-project', (projectId) => {
				socket.leave(`project:${projectId}`);
				logger.info(`User ${user.firstName} left project room: ${projectId}`);
			});

			// Handle joining client rooms
			socket.on('join-client', (clientId) => {
				socket.join(`client:${clientId}`);
				logger.info(`User ${user.firstName} joined client room: ${clientId}`);
			});

			// Handle leaving client rooms
			socket.on('leave-client', (clientId) => {
				socket.leave(`client:${clientId}`);
				logger.info(`User ${user.firstName} left client room: ${clientId}`);
			});

			// Handle moodboard collaboration
			socket.on('join-moodboard', (moodboardId) => {
				socket.join(`moodboard:${moodboardId}`);
				logger.info(`User ${user.firstName} joined moodboard room: ${moodboardId}`);
			});

			// Handle moodboard item updates
			socket.on('moodboard-item-update', (data) => {
				const { moodboardId, itemId, updates } = data;
				socket.to(`moodboard:${moodboardId}`).emit('moodboard-item-updated', {
					itemId,
					updates,
					updatedBy: {
						id: user._id,
						name: `${user.firstName} ${user.lastName}`,
						avatar: user.avatar
					},
					timestamp: new Date()
				});
			});

			// Handle moodboard comments
			socket.on('moodboard-comment', (data) => {
				const { moodboardId, comment } = data;
				socket.to(`moodboard:${moodboardId}`).emit('moodboard-comment-added', {
					comment: {
						...comment,
						author: {
							id: user._id,
							name: `${user.firstName} ${user.lastName}`,
							avatar: user.avatar
						},
						createdAt: new Date()
					}
				});
			});

			// Handle project progress updates
			socket.on('project-progress-update', (data) => {
				const { projectId, progress } = data;
				socket.to(`project:${projectId}`).emit('project-progress-updated', {
					projectId,
					progress,
					updatedBy: {
						id: user._id,
						name: `${user.firstName} ${user.lastName}`
					},
					timestamp: new Date()
				});
			});

			// Handle estimate updates
			socket.on('estimate-update', (data) => {
				const { estimateId, clientId, updates } = data;
				socket.to(`client:${clientId}`).emit('estimate-updated', {
					estimateId,
					updates,
					updatedBy: {
						id: user._id,
						name: `${user.firstName} ${user.lastName}`
					},
					timestamp: new Date()
				});
			});

			// Handle typing indicators
			socket.on('typing-start', (data) => {
				const { room, type } = data;
				socket.to(room).emit('user-typing', {
					userId: user._id,
					userName: `${user.firstName} ${user.lastName}`,
					type,
					timestamp: new Date()
				});
			});

			socket.on('typing-stop', (data) => {
				const { room } = data;
				socket.to(room).emit('user-stopped-typing', {
					userId: user._id,
					timestamp: new Date()
				});
			});

			// Handle disconnect
			socket.on('disconnect', () => {
				logger.info(`User disconnected: ${user.firstName} ${user.lastName} (${socket.id})`);
				this.connectedUsers.delete(user._id.toString());
				this.userRooms.delete(user._id.toString());
			});
		});
	}

	// Send notification to specific user
	sendToUser(userId, event, data) {
		const userConnection = this.connectedUsers.get(userId.toString());
		if (userConnection) {
			this.io.to(userConnection.socketId).emit(event, data);
			return true;
		}
		return false;
	}

	// Send notification to project room
	sendToProject(projectId, event, data) {
		this.io.to(`project:${projectId}`).emit(event, data);
	}

	// Send notification to client room
	sendToClient(clientId, event, data) {
		this.io.to(`client:${clientId}`).emit(event, data);
	}

	// Send notification to moodboard room
	sendToMoodboard(moodboardId, event, data) {
		this.io.to(`moodboard:${moodboardId}`).emit(event, data);
	}

	// Send notification to all connected users
	sendToAll(event, data) {
		this.io.emit(event, data);
	}

	// Send notification to users with specific roles
	sendToRole(role, event, data) {
		// This would require additional logic to check user roles
		// For now, we'll broadcast to all users
		this.io.emit(event, data);
	}

	// Project-specific notifications
	notifyProjectUpdate(projectId, updateType, data) {
		this.sendToProject(projectId, 'project-update', {
			type: updateType,
			data,
			timestamp: new Date()
		});
	}

	notifyProjectMilestoneCompleted(projectId, milestone) {
		this.sendToProject(projectId, 'milestone-completed', {
			milestone,
			timestamp: new Date()
		});
	}

	notifyProjectProgressUpdate(projectId, progress) {
		this.sendToProject(projectId, 'progress-updated', {
			progress,
			timestamp: new Date()
		});
	}

	// Client-specific notifications
	notifyClientUpdate(clientId, updateType, data) {
		this.sendToClient(clientId, 'client-update', {
			type: updateType,
			data,
			timestamp: new Date()
		});
	}

	notifyNewEstimate(clientId, estimate) {
		this.sendToClient(clientId, 'new-estimate', {
			estimate,
			timestamp: new Date()
		});
	}

	notifyNewMoodboard(clientId, moodboard) {
		this.sendToClient(clientId, 'new-moodboard', {
			moodboard,
			timestamp: new Date()
		});
	}

	// Moodboard collaboration
	notifyMoodboardUpdate(moodboardId, updateType, data) {
		this.sendToMoodboard(moodboardId, 'moodboard-update', {
			type: updateType,
			data,
			timestamp: new Date()
		});
	}

	notifyMoodboardItemAdded(moodboardId, item) {
		this.sendToMoodboard(moodboardId, 'item-added', {
			item,
			timestamp: new Date()
		});
	}

	notifyMoodboardItemUpdated(moodboardId, itemId, updates) {
		this.sendToMoodboard(moodboardId, 'item-updated', {
			itemId,
			updates,
			timestamp: new Date()
		});
	}

	notifyMoodboardItemRemoved(moodboardId, itemId) {
		this.sendToMoodboard(moodboardId, 'item-removed', {
			itemId,
			timestamp: new Date()
		});
	}

	notifyMoodboardComment(moodboardId, comment) {
		this.sendToMoodboard(moodboardId, 'comment-added', {
			comment,
			timestamp: new Date()
		});
	}

	// System notifications
	notifySystemMaintenance(message) {
		this.sendToAll('system-maintenance', {
			message,
			timestamp: new Date()
		});
	}

	notifyNewFeature(feature) {
		this.sendToAll('new-feature', {
			feature,
			timestamp: new Date()
		});
	}

	// Get connected users count
	getConnectedUsersCount() {
		return this.connectedUsers.size;
	}

	// Get connected users list
	getConnectedUsers() {
		return Array.from(this.connectedUsers.values()).map(connection => ({
			id: connection.user._id,
			name: `${connection.user.firstName} ${connection.user.lastName}`,
			email: connection.user.email,
			connectedAt: connection.connectedAt
		}));
	}

	// Check if user is connected
	isUserConnected(userId) {
		return this.connectedUsers.has(userId.toString());
	}

	// Get user's socket ID
	getUserSocketId(userId) {
		const connection = this.connectedUsers.get(userId.toString());
		return connection ? connection.socketId : null;
	}
}

export default new RealtimeService();
