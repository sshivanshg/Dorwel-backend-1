import httpStatus from 'http-status';
import catchAsync from '~/utils/catchAsync';
import APIError from '~/utils/apiError';
import Moodboard from '~/models/moodboardModel';
import Project from '~/models/projectModel';
import Client from '~/models/clientModel';
import Notification from '~/models/notificationModel';
import aiService from '~/services/aiService';
import messagingService from '~/services/messagingService';
import crypto from 'crypto';

const createMoodboard = catchAsync(async (req, res) => {
	const moodboard = await Moodboard.create({
		...req.body,
		createdBy: req.user.id
	});

	// Populate related data
	await moodboard.populate([
		{ path: 'project', select: 'name description status' },
		{ path: 'client', select: 'firstName lastName email phone company' },
		{ path: 'createdBy', select: 'firstName lastName email avatar' }
	]);

	// Create notification for client
	await Notification.createNotification({
		title: 'New Moodboard Created',
		message: `New moodboard "${moodboard.title}" has been created for your project`,
		type: 'info',
		recipient: moodboard.client._id,
		relatedEntity: {
			type: 'moodboard',
			id: moodboard._id
		},
		priority: 'medium',
		metadata: {
			actionUrl: `${process.env.FRONTEND_URL}/moodboards/${moodboard._id}`,
			actionText: 'View Moodboard'
		}
	});

	res.status(httpStatus.CREATED).json({
		success: true,
		message: 'Moodboard created successfully',
		data: moodboard
	});
});

const getMoodboards = catchAsync(async (req, res) => {
	const { status, projectId, clientId, createdBy, search, page = 1, limit = 10 } = req.query;
	
	let query = {};
	
	if (status) {
		query.status = status;
	}
	
	if (projectId) {
		query.project = projectId;
	}
	
	if (clientId) {
		query.client = clientId;
	}
	
	if (createdBy) {
		query.createdBy = createdBy;
	}
	
	if (search) {
		const searchRegex = new RegExp(search, 'i');
		query.$or = [
			{ title: searchRegex },
			{ description: searchRegex },
			{ 'items.name': searchRegex },
			{ 'items.description': searchRegex },
			{ tags: { $in: [searchRegex] } }
		];
	}

	const moodboards = await Moodboard.paginate(query, {
		page: parseInt(page),
		limit: parseInt(limit),
		populate: [
			{ path: 'project', select: 'name description status' },
			{ path: 'client', select: 'firstName lastName email phone company' },
			{ path: 'createdBy', select: 'firstName lastName email avatar' }
		],
		sort: { createdAt: -1 }
	});

	res.json({
		success: true,
		data: moodboards
	});
});

const getMoodboard = catchAsync(async (req, res) => {
	const moodboard = await Moodboard.getMoodboardById(req.params.moodboardId);
	
	if (!moodboard) {
		throw new APIError('Moodboard not found', httpStatus.NOT_FOUND);
	}

	// Increment view count if accessed via share token
	if (req.query.token) {
		await Moodboard.incrementViewCount(moodboard._id);
	}

	res.json({
		success: true,
		data: moodboard
	});
});

const updateMoodboard = catchAsync(async (req, res) => {
	const moodboard = await Moodboard.findByIdAndUpdate(
		req.params.moodboardId,
		req.body,
		{ new: true, runValidators: true }
	).populate([
		{ path: 'project', select: 'name description status' },
		{ path: 'client', select: 'firstName lastName email phone company' },
		{ path: 'createdBy', select: 'firstName lastName email avatar' }
	]);

	if (!moodboard) {
		throw new APIError('Moodboard not found', httpStatus.NOT_FOUND);
	}

	// Add update comment
	moodboard.comments.push({
		content: 'Moodboard updated',
		author: req.user.id
	});
	await moodboard.save();

	res.json({
		success: true,
		message: 'Moodboard updated successfully',
		data: moodboard
	});
});

const deleteMoodboard = catchAsync(async (req, res) => {
	const moodboard = await Moodboard.findByIdAndDelete(req.params.moodboardId);

	if (!moodboard) {
		throw new APIError('Moodboard not found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		message: 'Moodboard deleted successfully'
	});
});

const updateMoodboardStatus = catchAsync(async (req, res) => {
	const { status } = req.body;
	
	const moodboard = await Moodboard.updateMoodboardStatus(req.params.moodboardId, status, req.user.id);

	// Send notification to client if moodboard is shared
	if (status === 'shared') {
		await Notification.createNotification({
			title: 'Moodboard Shared',
			message: `Moodboard "${moodboard.title}" has been shared with you`,
			type: 'info',
			recipient: moodboard.client._id,
			relatedEntity: {
				type: 'moodboard',
				id: moodboard._id
			},
			priority: 'medium'
		});

		// Send WhatsApp/SMS notification
		try {
			await messagingService.sendMoodboardNotification(
				moodboard.client.phone,
				moodboard.client.firstName,
				moodboard.title,
				`${process.env.FRONTEND_URL}/moodboards/${moodboard._id}`
			);
		} catch (error) {
			console.error('Failed to send moodboard notification:', error);
		}
	}

	res.json({
		success: true,
		message: 'Moodboard status updated successfully',
		data: moodboard
	});
});

const addItem = catchAsync(async (req, res) => {
	const itemData = req.body;
	
	const moodboard = await Moodboard.addItem(req.params.moodboardId, itemData, req.user.id);

	// Add item addition comment
	moodboard.comments.push({
		content: `Added item: ${itemData.name}`,
		author: req.user.id
	});
	await moodboard.save();

	res.json({
		success: true,
		message: 'Item added successfully',
		data: moodboard
	});
});

const updateItem = catchAsync(async (req, res) => {
	const { itemId, updateData } = req.body;
	
	const moodboard = await Moodboard.updateItem(req.params.moodboardId, itemId, updateData, req.user.id);

	res.json({
		success: true,
		message: 'Item updated successfully',
		data: moodboard
	});
});

const removeItem = catchAsync(async (req, res) => {
	const { itemId } = req.body;
	
	const moodboard = await Moodboard.removeItem(req.params.moodboardId, itemId, req.user.id);

	// Add item removal comment
	moodboard.comments.push({
		content: 'Item removed from moodboard',
		author: req.user.id
	});
	await moodboard.save();

	res.json({
		success: true,
		message: 'Item removed successfully',
		data: moodboard
	});
});

const addComment = catchAsync(async (req, res) => {
	const commentData = req.body;
	
	const moodboard = await Moodboard.addComment(req.params.moodboardId, commentData, req.user.id);

	// Create notification for moodboard creator and other commenters
	const uniqueUsers = new Set([
		moodboard.createdBy.toString(),
		...moodboard.comments.map(c => c.author.toString())
	]);

	const notifications = Array.from(uniqueUsers)
		.filter(userId => userId !== req.user.id.toString())
		.map(userId => ({
			title: 'New Comment on Moodboard',
			message: `New comment added to moodboard "${moodboard.title}"`,
			type: 'info',
			recipient: userId,
			relatedEntity: {
				type: 'moodboard',
				id: moodboard._id
			},
			priority: 'low'
		}));

	if (notifications.length > 0) {
		await Notification.createBulkNotifications(notifications);
	}

	res.json({
		success: true,
		message: 'Comment added successfully',
		data: moodboard
	});
});

const addReply = catchAsync(async (req, res) => {
	const { commentId, replyData } = req.body;
	
	const moodboard = await Moodboard.addReply(req.params.moodboardId, commentId, replyData, req.user.id);

	res.json({
		success: true,
		message: 'Reply added successfully',
		data: moodboard
	});
});

const generateShareToken = catchAsync(async (req, res) => {
	const { isPublic, password, expiresAt } = req.body;
	
	const moodboard = await Moodboard.generateShareToken(req.params.moodboardId, {
		isPublic,
		password,
		expiresAt: expiresAt ? new Date(expiresAt) : null
	});

	res.json({
		success: true,
		message: 'Share token generated successfully',
		data: {
			shareToken: moodboard.sharing.shareToken,
			shareUrl: `${process.env.FRONTEND_URL}/moodboards/${moodboard._id}?token=${moodboard.sharing.shareToken}`,
			expiresAt: moodboard.sharing.expiresAt
		}
	});
});

const getMoodboardByToken = catchAsync(async (req, res) => {
	const { token } = req.params;
	
	const moodboard = await Moodboard.getMoodboardByShareToken(token);
	
	if (!moodboard) {
		throw new APIError('Moodboard not found or token invalid', httpStatus.NOT_FOUND);
	}

	// Check if token is expired
	if (moodboard.isExpired) {
		throw new APIError('Share token has expired', httpStatus.GONE);
	}

	// Increment view count
	await Moodboard.incrementViewCount(moodboard._id);

	res.json({
		success: true,
		data: moodboard
	});
});

const generateAISuggestions = catchAsync(async (req, res) => {
	const { projectDescription, style, colorScheme, budget } = req.body;

	// Check if AI service is available
	const isAIAvailable = await aiService.isServiceAvailable();
	if (!isAIAvailable) {
		throw new APIError('AI service is currently unavailable', httpStatus.SERVICE_UNAVAILABLE);
	}

	// Generate AI moodboard suggestions
	const aiSuggestions = await aiService.generateMoodboardSuggestions(
		projectDescription,
		style,
		colorScheme,
		budget
	);

	res.json({
		success: true,
		message: 'AI moodboard suggestions generated successfully',
		data: aiSuggestions
	});
});

const createMoodboardFromAI = catchAsync(async (req, res) => {
	const { projectId, clientId, title, description, aiSuggestions } = req.body;

	// Create moodboard with AI-generated items
	const moodboard = await Moodboard.create({
		title,
		description,
		project: projectId,
		client: clientId,
		items: aiSuggestions.suggestions.map(suggestion => ({
			type: suggestion.type,
			name: suggestion.name,
			description: suggestion.description,
			colors: suggestion.colors || [],
			metadata: {
				source: 'AI Generated',
				price: suggestion.budgetRange === 'high' ? 1000 : suggestion.budgetRange === 'medium' ? 500 : 100,
				currency: 'USD',
				availability: 'unknown'
			},
			tags: [suggestion.style, suggestion.mood],
			createdBy: req.user.id
		})),
		createdBy: req.user.id
	});

	// Populate related data
	await moodboard.populate([
		{ path: 'project', select: 'name description status' },
		{ path: 'client', select: 'firstName lastName email phone company' }
	]);

	res.status(httpStatus.CREATED).json({
		success: true,
		message: 'AI moodboard created successfully',
		data: moodboard
	});
});

const getMoodboardStats = catchAsync(async (req, res) => {
	const stats = await Moodboard.getMoodboardStats();

	res.json({
		success: true,
		data: stats
	});
});

const searchMoodboards = catchAsync(async (req, res) => {
	const { query } = req.query;
	
	const moodboards = await Moodboard.searchMoodboards(query);

	res.json({
		success: true,
		data: moodboards
	});
});

const getProjectMoodboards = catchAsync(async (req, res) => {
	const { projectId } = req.params;
	
	const moodboards = await Moodboard.getMoodboardsByProject(projectId);

	res.json({
		success: true,
		data: moodboards
	});
});

const getClientMoodboards = catchAsync(async (req, res) => {
	const { clientId } = req.params;
	
	const moodboards = await Moodboard.getMoodboardsByClient(clientId);

	res.json({
		success: true,
		data: moodboards
	});
});

const duplicateMoodboard = catchAsync(async (req, res) => {
	const originalMoodboard = await Moodboard.getMoodboardById(req.params.moodboardId);
	
	if (!originalMoodboard) {
		throw new APIError('Moodboard not found', httpStatus.NOT_FOUND);
	}

	// Create duplicate with new title
	const duplicateData = {
		...originalMoodboard.toObject(),
		_id: undefined,
		title: `${originalMoodboard.title} (Copy)`,
		status: 'draft',
		version: 1,
		createdBy: req.user.id,
		createdAt: new Date(),
		updatedAt: new Date(),
		sharing: {
			isPublic: false,
			viewCount: 0
		},
		comments: []
	};

	delete duplicateData.__v;

	const duplicate = await Moodboard.create(duplicateData);

	// Populate related data
	await duplicate.populate([
		{ path: 'project', select: 'name description status' },
		{ path: 'client', select: 'firstName lastName email phone company' },
		{ path: 'createdBy', select: 'firstName lastName email avatar' }
	]);

	res.status(httpStatus.CREATED).json({
		success: true,
		message: 'Moodboard duplicated successfully',
		data: duplicate
	});
});

export default {
	createMoodboard,
	getMoodboards,
	getMoodboard,
	updateMoodboard,
	deleteMoodboard,
	updateMoodboardStatus,
	addItem,
	updateItem,
	removeItem,
	addComment,
	addReply,
	generateShareToken,
	getMoodboardByToken,
	generateAISuggestions,
	createMoodboardFromAI,
	getMoodboardStats,
	searchMoodboards,
	getProjectMoodboards,
	getClientMoodboards,
	duplicateMoodboard
};
