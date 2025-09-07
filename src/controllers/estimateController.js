import httpStatus from 'http-status';
import catchAsync from '~/utils/catchAsync';
import APIError from '~/utils/apiError';
import Estimate from '~/models/estimateModel';
import Client from '~/models/clientModel';
import Project from '~/models/projectModel';
import Lead from '~/models/leadModel';
import Notification from '~/models/notificationModel';
import aiService from '~/services/aiService';
import pdfService from '~/services/pdfService';
import messagingService from '~/services/messagingService';

const createEstimate = catchAsync(async (req, res) => {
	const estimate = await Estimate.create({
		...req.body,
		createdBy: req.user.id
	});

	// Populate related data
	await estimate.populate([
		{ path: 'client', select: 'firstName lastName email phone company' },
		{ path: 'project', select: 'name description status' },
		{ path: 'lead', select: 'firstName lastName email projectType' }
	]);

	res.status(httpStatus.CREATED).json({
		success: true,
		message: 'Estimate created successfully',
		data: estimate
	});
});

const getEstimates = catchAsync(async (req, res) => {
	const { status, clientId, projectId, createdBy, search, page = 1, limit = 10 } = req.query;
	
	let query = {};
	
	if (status) {
		query.status = status;
	}
	
	if (clientId) {
		query.client = clientId;
	}
	
	if (projectId) {
		query.project = projectId;
	}
	
	if (createdBy) {
		query.createdBy = createdBy;
	}
	
	if (search) {
		const searchRegex = new RegExp(search, 'i');
		query.$or = [
			{ title: searchRegex },
			{ description: searchRegex },
			{ 'items.name': searchRegex }
		];
	}

	const estimates = await Estimate.paginate(query, {
		page: parseInt(page),
		limit: parseInt(limit),
		populate: [
			{ path: 'client', select: 'firstName lastName email phone company' },
			{ path: 'project', select: 'name description status' },
			{ path: 'createdBy', select: 'firstName lastName email avatar' }
		],
		sort: { createdAt: -1 }
	});

	res.json({
		success: true,
		data: estimates
	});
});

const getEstimate = catchAsync(async (req, res) => {
	const estimate = await Estimate.getEstimateById(req.params.estimateId);
	
	if (!estimate) {
		throw new APIError('Estimate not found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		data: estimate
	});
});

const updateEstimate = catchAsync(async (req, res) => {
	const estimate = await Estimate.findByIdAndUpdate(
		req.params.estimateId,
		req.body,
		{ new: true, runValidators: true }
	).populate([
		{ path: 'client', select: 'firstName lastName email phone company' },
		{ path: 'project', select: 'name description status' },
		{ path: 'createdBy', select: 'firstName lastName email avatar' }
	]);

	if (!estimate) {
		throw new APIError('Estimate not found', httpStatus.NOT_FOUND);
	}

	// Recalculate totals if items were modified
	if (req.body.items) {
		await Estimate.calculateTotals(estimate._id);
	}

	// Add update note
	estimate.notes.push({
		content: 'Estimate updated',
		createdBy: req.user.id
	});
	await estimate.save();

	res.json({
		success: true,
		message: 'Estimate updated successfully',
		data: estimate
	});
});

const deleteEstimate = catchAsync(async (req, res) => {
	const estimate = await Estimate.findByIdAndDelete(req.params.estimateId);

	if (!estimate) {
		throw new APIError('Estimate not found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		message: 'Estimate deleted successfully'
	});
});

const updateEstimateStatus = catchAsync(async (req, res) => {
	const { status } = req.body;
	
	const estimate = await Estimate.updateEstimateStatus(req.params.estimateId, status, req.user.id);

	// Send notification to client if estimate is sent
	if (status === 'sent') {
		await Notification.createNotification({
			title: 'New Estimate Available',
			message: `Your estimate "${estimate.title}" is ready for review`,
			type: 'info',
			recipient: estimate.client._id,
			relatedEntity: {
				type: 'estimate',
				id: estimate._id
			},
			priority: 'medium',
			metadata: {
				actionUrl: `${process.env.FRONTEND_URL}/estimates/${estimate._id}`,
				actionText: 'View Estimate'
			}
		});

		// Send WhatsApp/SMS notification
		try {
			await messagingService.sendEstimateNotification(
				estimate.client.phone,
				estimate.client.firstName,
				estimate.title,
				`${process.env.FRONTEND_URL}/estimates/${estimate._id}`
			);
		} catch (error) {
			console.error('Failed to send estimate notification:', error);
		}
	}

	res.json({
		success: true,
		message: 'Estimate status updated successfully',
		data: estimate
	});
});

const generateAIEstimate = catchAsync(async (req, res) => {
	const { projectDescription, projectType, projectSize, budget } = req.body;

	// Check if AI service is available
	const isAIAvailable = await aiService.isServiceAvailable();
	if (!isAIAvailable) {
		throw new APIError('AI service is currently unavailable', httpStatus.SERVICE_UNAVAILABLE);
	}

	// Generate AI estimate
	const aiEstimate = await aiService.generateEstimateItems(
		projectDescription,
		projectType,
		projectSize,
		budget
	);

	res.json({
		success: true,
		message: 'AI estimate generated successfully',
		data: aiEstimate
	});
});

const createEstimateFromAI = catchAsync(async (req, res) => {
	const { clientId, projectId, leadId, title, description, aiEstimate } = req.body;

	// Create estimate with AI-generated items
	const estimate = await Estimate.create({
		title,
		description,
		client: clientId,
		project: projectId,
		lead: leadId,
		items: aiEstimate.items,
		aiGeneration: {
			enabled: true,
			prompt: `Generate estimate for ${projectDescription}`,
			confidence: aiEstimate.confidence,
			generatedAt: new Date()
		},
		createdBy: req.user.id
	});

	// Populate related data
	await estimate.populate([
		{ path: 'client', select: 'firstName lastName email phone company' },
		{ path: 'project', select: 'name description status' },
		{ path: 'lead', select: 'firstName lastName email projectType' }
	]);

	res.status(httpStatus.CREATED).json({
		success: true,
		message: 'AI estimate created successfully',
		data: estimate
	});
});

const createRevision = catchAsync(async (req, res) => {
	const { updateData } = req.body;
	
	const revision = await Estimate.createRevision(req.params.estimateId, updateData, req.user.id);

	// Populate related data
	await revision.populate([
		{ path: 'client', select: 'firstName lastName email phone company' },
		{ path: 'project', select: 'name description status' },
		{ path: 'createdBy', select: 'firstName lastName email avatar' }
	]);

	res.status(httpStatus.CREATED).json({
		success: true,
		message: 'Estimate revision created successfully',
		data: revision
	});
});

const generatePDF = catchAsync(async (req, res) => {
	const estimate = await Estimate.getEstimateById(req.params.estimateId);
	
	if (!estimate) {
		throw new APIError('Estimate not found', httpStatus.NOT_FOUND);
	}

	// Generate PDF
	const pdfResult = await pdfService.generateEstimatePDF(estimate);

	// Update estimate with PDF attachment
	estimate.attachments.push({
		name: pdfResult.filename,
		type: 'pdf',
		url: pdfResult.publicUrl,
		uploadedBy: req.user.id,
		size: pdfResult.size
	});
	await estimate.save();

	res.json({
		success: true,
		message: 'PDF generated successfully',
		data: {
			filename: pdfResult.filename,
			url: pdfResult.publicUrl,
			size: pdfResult.size
		}
	});
});

const sendEstimate = catchAsync(async (req, res) => {
	const { method, message } = req.body;
	
	const estimate = await Estimate.getEstimateById(req.params.estimateId);
	
	if (!estimate) {
		throw new APIError('Estimate not found', httpStatus.NOT_FOUND);
	}

	// Generate PDF if not already exists
	let pdfUrl = estimate.attachments.find(att => att.type === 'pdf')?.url;
	if (!pdfUrl) {
		const pdfResult = await pdfService.generateEstimatePDF(estimate);
		pdfUrl = pdfResult.publicUrl;
	}

	// Send via specified method
	if (method === 'email') {
		// Email sending logic would go here
		// This would integrate with your existing email service
	} else if (method === 'whatsapp' || method === 'sms') {
		await messagingService.sendEstimateNotification(
			estimate.client.phone,
			estimate.client.firstName,
			estimate.title,
			pdfUrl
		);
	}

	// Update estimate status
	await Estimate.updateEstimateStatus(estimate._id, 'sent', req.user.id);

	res.json({
		success: true,
		message: 'Estimate sent successfully'
	});
});

const addNote = catchAsync(async (req, res) => {
	const { content } = req.body;
	
	const estimate = await Estimate.addNote(req.params.estimateId, content, req.user.id);

	res.json({
		success: true,
		message: 'Note added successfully',
		data: estimate
	});
});

const getEstimateStats = catchAsync(async (req, res) => {
	const stats = await Estimate.getEstimateStats();

	res.json({
		success: true,
		data: stats
	});
});

const searchEstimates = catchAsync(async (req, res) => {
	const { query } = req.query;
	
	const estimates = await Estimate.searchEstimates(query);

	res.json({
		success: true,
		data: estimates
	});
});

const duplicateEstimate = catchAsync(async (req, res) => {
	const originalEstimate = await Estimate.getEstimateById(req.params.estimateId);
	
	if (!originalEstimate) {
		throw new APIError('Estimate not found', httpStatus.NOT_FOUND);
	}

	// Create duplicate with new title
	const duplicateData = {
		...originalEstimate.toObject(),
		_id: undefined,
		title: `${originalEstimate.title} (Copy)`,
		status: 'draft',
		version: 1,
		createdBy: req.user.id,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	delete duplicateData.__v;

	const duplicate = await Estimate.create(duplicateData);

	// Populate related data
	await duplicate.populate([
		{ path: 'client', select: 'firstName lastName email phone company' },
		{ path: 'project', select: 'name description status' },
		{ path: 'createdBy', select: 'firstName lastName email avatar' }
	]);

	res.status(httpStatus.CREATED).json({
		success: true,
		message: 'Estimate duplicated successfully',
		data: duplicate
	});
});

export default {
	createEstimate,
	getEstimates,
	getEstimate,
	updateEstimate,
	deleteEstimate,
	updateEstimateStatus,
	generateAIEstimate,
	createEstimateFromAI,
	createRevision,
	generatePDF,
	sendEstimate,
	addNote,
	getEstimateStats,
	searchEstimates,
	duplicateEstimate
};
