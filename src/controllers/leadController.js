import httpStatus from 'http-status';
import catchAsync from '~/utils/catchAsync';
import APIError from '~/utils/apiError';
import Lead from '~/models/leadModel';
import Client from '~/models/clientModel';
import Project from '~/models/projectModel';
import Notification from '~/models/notificationModel';
import messagingService from '~/services/messagingService';
import aiService from '~/services/aiService';

const createLead = catchAsync(async (req, res) => {
	const lead = await Lead.create(req.body);
	
	// Create notification for assigned user
	if (lead.assignedTo) {
		await Notification.createNotification({
			title: 'New Lead Assigned',
			message: `New lead ${lead.fullName} has been assigned to you`,
			type: 'info',
			recipient: lead.assignedTo,
			relatedEntity: {
				type: 'lead',
				id: lead._id
			},
			priority: 'medium'
		});
	}

	res.status(httpStatus.CREATED).json({
		success: true,
		message: 'Lead created successfully',
		data: lead
	});
});

const getLeads = catchAsync(async (req, res) => {
	const { status, assignedTo, search, page = 1, limit = 10 } = req.query;
	
	let query = {};
	
	if (status) {
		query.status = status;
	}
	
	if (assignedTo) {
		query.assignedTo = assignedTo;
	}
	
	if (search) {
		const searchRegex = new RegExp(search, 'i');
		query.$or = [
			{ firstName: searchRegex },
			{ lastName: searchRegex },
			{ email: searchRegex },
			{ company: searchRegex },
			{ 'location.city': searchRegex },
			{ 'location.state': searchRegex }
		];
	}

	const leads = await Lead.paginate(query, {
		page: parseInt(page),
		limit: parseInt(limit),
		populate: 'assignedTo',
		sort: { createdAt: -1 }
	});

	res.json({
		success: true,
		data: leads
	});
});

const getLead = catchAsync(async (req, res) => {
	const lead = await Lead.getLeadById(req.params.leadId);
	
	if (!lead) {
		throw new APIError('Lead not found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		data: lead
	});
});

const updateLead = catchAsync(async (req, res) => {
	const lead = await Lead.findByIdAndUpdate(
		req.params.leadId,
		req.body,
		{ new: true, runValidators: true }
	).populate('assignedTo', 'firstName lastName email avatar');

	if (!lead) {
		throw new APIError('Lead not found', httpStatus.NOT_FOUND);
	}

	// Add update note
	lead.notes.push({
		content: 'Lead information updated',
		createdBy: req.user.id
	});
	await lead.save();

	res.json({
		success: true,
		message: 'Lead updated successfully',
		data: lead
	});
});

const deleteLead = catchAsync(async (req, res) => {
	const lead = await Lead.findByIdAndDelete(req.params.leadId);

	if (!lead) {
		throw new APIError('Lead not found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		message: 'Lead deleted successfully'
	});
});

const updateLeadStatus = catchAsync(async (req, res) => {
	const { status } = req.body;
	
	const lead = await Lead.updateLeadStatus(req.params.leadId, status, req.user.id);

	res.json({
		success: true,
		message: 'Lead status updated successfully',
		data: lead
	});
});

const addNote = catchAsync(async (req, res) => {
	const { content } = req.body;
	
	const lead = await Lead.addNote(req.params.leadId, content, req.user.id);

	res.json({
		success: true,
		message: 'Note added successfully',
		data: lead
	});
});

const convertToClient = catchAsync(async (req, res) => {
	const lead = await Lead.getLeadById(req.params.leadId);
	
	if (!lead) {
		throw new APIError('Lead not found', httpStatus.NOT_FOUND);
	}

	// Create client from lead
	const clientData = {
		firstName: lead.firstName,
		lastName: lead.lastName,
		email: lead.email,
		phone: lead.phone,
		company: lead.company,
		address: {
			street: lead.location.address,
			city: lead.location.city,
			state: lead.location.state,
			zipCode: lead.location.zipCode,
			country: lead.location.country
		},
		preferences: {
			communicationMethod: lead.preferredContactMethod,
			preferredContactTime: lead.preferredContactTime
		},
		assignedTo: lead.assignedTo,
		leadSource: lead._id,
		notes: [{
			content: `Converted from lead on ${new Date().toLocaleDateString()}`,
			createdBy: req.user.id
		}]
	};

	const client = await Client.create(clientData);

	// Update lead status
	lead.status = 'converted';
	lead.conversionDate = new Date();
	await lead.save();

	// Create notification
	await Notification.createNotification({
		title: 'Lead Converted to Client',
		message: `Lead ${lead.fullName} has been converted to client`,
		type: 'success',
		recipient: req.user.id,
		relatedEntity: {
			type: 'client',
			id: client._id
		},
		priority: 'high'
	});

	res.json({
		success: true,
		message: 'Lead converted to client successfully',
		data: {
			lead,
			client
		}
	});
});

const convertToProject = catchAsync(async (req, res) => {
	const { projectData } = req.body;
	
	const lead = await Lead.getLeadById(req.params.leadId);
	
	if (!lead) {
		throw new APIError('Lead not found', httpStatus.NOT_FOUND);
	}

	// First convert to client if not already
	let client = await Client.findOne({ leadSource: lead._id });
	
	if (!client) {
		const clientData = {
			firstName: lead.firstName,
			lastName: lead.lastName,
			email: lead.email,
			phone: lead.phone,
			company: lead.company,
			address: {
				street: lead.location.address,
				city: lead.location.city,
				state: lead.location.state,
				zipCode: lead.location.zipCode,
				country: lead.location.country
			},
			preferences: {
				communicationMethod: lead.preferredContactMethod,
				preferredContactTime: lead.preferredContactTime
			},
			assignedTo: lead.assignedTo,
			leadSource: lead._id
		};
		client = await Client.create(clientData);
	}

	// Create project
	const project = await Project.create({
		...projectData,
		client: client._id,
		leadSource: lead._id,
		createdBy: req.user.id
	});

	// Update lead status
	await Lead.convertToProject(lead._id, project._id);

	// Create notification
	await Notification.createNotification({
		title: 'Lead Converted to Project',
		message: `Lead ${lead.fullName} has been converted to project: ${project.name}`,
		type: 'success',
		recipient: req.user.id,
		relatedEntity: {
			type: 'project',
			id: project._id
		},
		priority: 'high'
	});

	res.json({
		success: true,
		message: 'Lead converted to project successfully',
		data: {
			lead,
			client,
			project
		}
	});
});

const sendFollowUp = catchAsync(async (req, res) => {
	const { followUpType, message, sendVia } = req.body;
	
	const lead = await Lead.getLeadById(req.params.leadId);
	
	if (!lead) {
		throw new APIError('Lead not found', httpStatus.NOT_FOUND);
	}

	// Send follow-up message
	if (sendVia === 'whatsapp' || sendVia === 'sms') {
		await messagingService.sendLeadFollowUp(
			lead.phone,
			lead.fullName,
			followUpType,
			{ message }
		);
	}

	// Update last contact date
	lead.lastContactDate = new Date();
	lead.nextFollowUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
	await lead.save();

	// Add follow-up note
	lead.notes.push({
		content: `Follow-up sent via ${sendVia}: ${message}`,
		createdBy: req.user.id
	});
	await lead.save();

	res.json({
		success: true,
		message: 'Follow-up sent successfully'
	});
});

const generateAIEstimate = catchAsync(async (req, res) => {
	const lead = await Lead.getLeadById(req.params.leadId);
	
	if (!lead) {
		throw new APIError('Lead not found', httpStatus.NOT_FOUND);
	}

	// Check if AI service is available
	const isAIAvailable = await aiService.isServiceAvailable();
	if (!isAIAvailable) {
		throw new APIError('AI service is currently unavailable', httpStatus.SERVICE_UNAVAILABLE);
	}

	// Generate AI estimate
	const aiEstimate = await aiService.generateEstimateItems(
		lead.projectDescription,
		lead.projectType,
		lead.projectSize,
		lead.budget
	);

	res.json({
		success: true,
		message: 'AI estimate generated successfully',
		data: {
			lead,
			aiEstimate
		}
	});
});

const getLeadStats = catchAsync(async (req, res) => {
	const stats = await Lead.getLeadStats();

	res.json({
		success: true,
		data: stats
	});
});

const searchLeads = catchAsync(async (req, res) => {
	const { query } = req.query;
	
	const leads = await Lead.searchLeads(query);

	res.json({
		success: true,
		data: leads
	});
});

export default {
	createLead,
	getLeads,
	getLead,
	updateLead,
	deleteLead,
	updateLeadStatus,
	addNote,
	convertToClient,
	convertToProject,
	sendFollowUp,
	generateAIEstimate,
	getLeadStats,
	searchLeads
};
