import httpStatus from 'http-status';
import catchAsync from '~/utils/catchAsync';
import APIError from '~/utils/apiError';
import Client from '~/models/clientModel';
import Project from '~/models/projectModel';
import Lead from '~/models/leadModel';
import Notification from '~/models/notificationModel';
import messagingService from '~/services/messagingService';

const createClient = catchAsync(async (req, res) => {
	const client = await Client.create(req.body);

	// Populate related data
	await client.populate([
		{ path: 'assignedTo', select: 'firstName lastName email avatar' },
		{ path: 'leadSource', select: 'firstName lastName email projectType' }
	]);

	// Create notification for assigned user
	if (client.assignedTo) {
		await Notification.createNotification({
			title: 'New Client Assigned',
			message: `New client ${client.fullName} has been assigned to you`,
			type: 'info',
			recipient: client.assignedTo,
			relatedEntity: {
				type: 'client',
				id: client._id
			},
			priority: 'medium'
		});
	}

	res.status(httpStatus.CREATED).json({
		success: true,
		message: 'Client created successfully',
		data: client
	});
});

const getClients = catchAsync(async (req, res) => {
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
			{ 'address.city': searchRegex },
			{ 'address.state': searchRegex },
			{ industry: searchRegex }
		];
	}

	const clients = await Client.paginate(query, {
		page: parseInt(page),
		limit: parseInt(limit),
		populate: 'assignedTo',
		sort: { createdAt: -1 }
	});

	res.json({
		success: true,
		data: clients
	});
});

const getClient = catchAsync(async (req, res) => {
	const client = await Client.getClientById(req.params.clientId);
	
	if (!client) {
		throw new APIError('Client not found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		data: client
	});
});

const updateClient = catchAsync(async (req, res) => {
	const client = await Client.findByIdAndUpdate(
		req.params.clientId,
		req.body,
		{ new: true, runValidators: true }
	).populate([
		{ path: 'assignedTo', select: 'firstName lastName email avatar' },
		{ path: 'leadSource', select: 'firstName lastName email projectType' }
	]);

	if (!client) {
		throw new APIError('Client not found', httpStatus.NOT_FOUND);
	}

	// Add update note
	client.notes.push({
		content: 'Client information updated',
		createdBy: req.user.id
	});
	await client.save();

	res.json({
		success: true,
		message: 'Client updated successfully',
		data: client
	});
});

const deleteClient = catchAsync(async (req, res) => {
	const client = await Client.findByIdAndDelete(req.params.clientId);

	if (!client) {
		throw new APIError('Client not found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		message: 'Client deleted successfully'
	});
});

const updateClientStatus = catchAsync(async (req, res) => {
	const { status } = req.body;
	
	const client = await Client.updateClientStatus(req.params.clientId, status, req.user.id);

	res.json({
		success: true,
		message: 'Client status updated successfully',
		data: client
	});
});

const addNote = catchAsync(async (req, res) => {
	const { content } = req.body;
	
	const client = await Client.addNote(req.params.clientId, content, req.user.id);

	res.json({
		success: true,
		message: 'Note added successfully',
		data: client
	});
});

const updatePortalAccess = catchAsync(async (req, res) => {
	const { enabled } = req.body;
	
	const client = await Client.updatePortalAccess(req.params.clientId, enabled);

	res.json({
		success: true,
		message: 'Portal access updated successfully',
		data: client
	});
});

const getClientProjects = catchAsync(async (req, res) => {
	const { clientId } = req.params;
	
	const projects = await Project.getProjectsByClient(clientId);

	res.json({
		success: true,
		data: projects
	});
});

const getClientStats = catchAsync(async (req, res) => {
	const stats = await Client.getClientStats();

	res.json({
		success: true,
		data: stats
	});
});

const searchClients = catchAsync(async (req, res) => {
	const { query } = req.query;
	
	const clients = await Client.searchClients(query);

	res.json({
		success: true,
		data: clients
	});
});

const sendMessage = catchAsync(async (req, res) => {
	const { message, method = 'whatsapp' } = req.body;
	
	const client = await Client.getClientById(req.params.clientId);
	
	if (!client) {
		throw new APIError('Client not found', httpStatus.NOT_FOUND);
	}

	// Send message via specified method
	if (method === 'whatsapp' || method === 'sms') {
		await messagingService.sendProjectUpdate(
			client.phone,
			'General Message',
			'general_update',
			{ message }
		);
	}

	// Add message note
	client.notes.push({
		content: `Message sent via ${method}: ${message}`,
		createdBy: req.user.id
	});
	await client.save();

	res.json({
		success: true,
		message: 'Message sent successfully'
	});
});

const scheduleAppointment = catchAsync(async (req, res) => {
	const { appointmentDate, appointmentTime, location, notes } = req.body;
	
	const client = await Client.getClientById(req.params.clientId);
	
	if (!client) {
		throw new APIError('Client not found', httpStatus.NOT_FOUND);
	}

	// Send appointment confirmation
	try {
		await messagingService.sendAppointmentReminder(
			client.phone,
			client.firstName,
			appointmentDate,
			appointmentTime,
			location
		);
	} catch (error) {
		console.error('Failed to send appointment reminder:', error);
	}

	// Add appointment note
	client.notes.push({
		content: `Appointment scheduled for ${appointmentDate} at ${appointmentTime} - ${location}. Notes: ${notes || 'None'}`,
		createdBy: req.user.id
	});
	await client.save();

	// Create notification for assigned user
	if (client.assignedTo) {
		await Notification.createNotification({
			title: 'Appointment Scheduled',
			message: `Appointment scheduled with ${client.fullName} for ${appointmentDate} at ${appointmentTime}`,
			type: 'info',
			recipient: client.assignedTo,
			relatedEntity: {
				type: 'client',
				id: client._id
			},
			priority: 'medium'
		});
	}

	res.json({
		success: true,
		message: 'Appointment scheduled successfully'
	});
});

const getClientTimeline = catchAsync(async (req, res) => {
	const { clientId } = req.params;
	
	// Get client with all related activities
	const client = await Client.getClientById(clientId);
	
	if (!client) {
		throw new APIError('Client not found', httpStatus.NOT_FOUND);
	}

	// Get projects
	const projects = await Project.getProjectsByClient(clientId);
	
	// Get leads
	const leads = await Lead.find({ 
		$or: [
			{ email: client.email },
			{ phone: client.phone }
		]
	}).populate('assignedTo', 'firstName lastName email avatar');

	// Combine all activities
	const timeline = [
		// Client notes
		...client.notes.map(note => ({
			type: 'note',
			date: note.createdAt,
			content: note.content,
			author: note.createdBy
		})),
		
		// Projects
		...projects.map(project => ({
			type: 'project',
			date: project.createdAt,
			content: `Project "${project.name}" created`,
			project: project
		})),
		
		// Leads
		...leads.map(lead => ({
			type: 'lead',
			date: lead.createdAt,
			content: `Lead "${lead.fullName}" created`,
			lead: lead
		}))
	].sort((a, b) => new Date(b.date) - new Date(a.date));

	res.json({
		success: true,
		data: {
			client,
			timeline
		}
	});
});

const updateClientPreferences = catchAsync(async (req, res) => {
	const { preferences } = req.body;
	
	const client = await Client.findById(req.params.clientId);
	
	if (!client) {
		throw new APIError('Client not found', httpStatus.NOT_FOUND);
	}

	client.preferences = { ...client.preferences, ...preferences };
	await client.save();

	res.json({
		success: true,
		message: 'Client preferences updated successfully',
		data: client
	});
});

const addCustomField = catchAsync(async (req, res) => {
	const { key, value } = req.body;
	
	const client = await Client.findById(req.params.clientId);
	
	if (!client) {
		throw new APIError('Client not found', httpStatus.NOT_FOUND);
	}

	// Check if field already exists
	const existingField = client.customFields.find(field => field.key === key);
	if (existingField) {
		existingField.value = value;
	} else {
		client.customFields.push({ key, value });
	}

	await client.save();

	res.json({
		success: true,
		message: 'Custom field added successfully',
		data: client
	});
});

const removeCustomField = catchAsync(async (req, res) => {
	const { key } = req.body;
	
	const client = await Client.findById(req.params.clientId);
	
	if (!client) {
		throw new APIError('Client not found', httpStatus.NOT_FOUND);
	}

	client.customFields = client.customFields.filter(field => field.key !== key);
	await client.save();

	res.json({
		success: true,
		message: 'Custom field removed successfully',
		data: client
	});
});

export default {
	createClient,
	getClients,
	getClient,
	updateClient,
	deleteClient,
	updateClientStatus,
	addNote,
	updatePortalAccess,
	getClientProjects,
	getClientStats,
	searchClients,
	sendMessage,
	scheduleAppointment,
	getClientTimeline,
	updateClientPreferences,
	addCustomField,
	removeCustomField
};
