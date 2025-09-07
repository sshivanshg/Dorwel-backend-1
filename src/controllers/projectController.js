import httpStatus from 'http-status';
import catchAsync from '~/utils/catchAsync';
import APIError from '~/utils/apiError';
import Project from '~/models/projectModel';
import Client from '~/models/clientModel';
import Lead from '~/models/leadModel';
import Notification from '~/models/notificationModel';
import messagingService from '~/services/messagingService';
import pdfService from '~/services/pdfService';

const createProject = catchAsync(async (req, res) => {
	const project = await Project.create({
		...req.body,
		createdBy: req.user.id
	});

	// Populate related data
	await project.populate([
		{ path: 'client', select: 'firstName lastName email phone company' },
		{ path: 'team.user', select: 'firstName lastName email avatar' },
		{ path: 'leadSource', select: 'firstName lastName email projectType' }
	]);

	// Create notification for team members
	if (project.team && project.team.length > 0) {
		const notifications = project.team.map(member => ({
			title: 'Added to New Project',
			message: `You have been added to project: ${project.name}`,
			type: 'info',
			recipient: member.user,
			relatedEntity: {
				type: 'project',
				id: project._id
			},
			priority: 'medium'
		}));

		await Notification.createBulkNotifications(notifications);
	}

	// Create notification for client
	await Notification.createNotification({
		title: 'New Project Created',
		message: `Your project "${project.name}" has been created and is ready to begin`,
		type: 'success',
		recipient: project.client._id,
		relatedEntity: {
			type: 'project',
			id: project._id
		},
		priority: 'high',
		metadata: {
			actionUrl: `${process.env.FRONTEND_URL}/projects/${project._id}`,
			actionText: 'View Project'
		}
	});

	res.status(httpStatus.CREATED).json({
		success: true,
		message: 'Project created successfully',
		data: project
	});
});

const getProjects = catchAsync(async (req, res) => {
	const { status, clientId, teamMember, search, page = 1, limit = 10 } = req.query;
	
	let query = {};
	
	if (status) {
		query.status = status;
	}
	
	if (clientId) {
		query.client = clientId;
	}
	
	if (teamMember) {
		query['team.user'] = teamMember;
	}
	
	if (search) {
		const searchRegex = new RegExp(search, 'i');
		query.$or = [
			{ name: searchRegex },
			{ description: searchRegex },
			{ 'location.city': searchRegex },
			{ 'location.state': searchRegex },
			{ tags: { $in: [searchRegex] } }
		];
	}

	const projects = await Project.paginate(query, {
		page: parseInt(page),
		limit: parseInt(limit),
		populate: [
			{ path: 'client', select: 'firstName lastName email phone company' },
			{ path: 'team.user', select: 'firstName lastName email avatar' },
			{ path: 'createdBy', select: 'firstName lastName email avatar' }
		],
		sort: { createdAt: -1 }
	});

	res.json({
		success: true,
		data: projects
	});
});

const getProject = catchAsync(async (req, res) => {
	const project = await Project.getProjectById(req.params.projectId);
	
	if (!project) {
		throw new APIError('Project not found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		data: project
	});
});

const updateProject = catchAsync(async (req, res) => {
	const project = await Project.findByIdAndUpdate(
		req.params.projectId,
		req.body,
		{ new: true, runValidators: true }
	).populate([
		{ path: 'client', select: 'firstName lastName email phone company' },
		{ path: 'team.user', select: 'firstName lastName email avatar' },
		{ path: 'createdBy', select: 'firstName lastName email avatar' }
	]);

	if (!project) {
		throw new APIError('Project not found', httpStatus.NOT_FOUND);
	}

	// Add update note
	project.notes.push({
		content: 'Project information updated',
		createdBy: req.user.id
	});
	await project.save();

	res.json({
		success: true,
		message: 'Project updated successfully',
		data: project
	});
});

const deleteProject = catchAsync(async (req, res) => {
	const project = await Project.findByIdAndDelete(req.params.projectId);

	if (!project) {
		throw new APIError('Project not found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		message: 'Project deleted successfully'
	});
});

const updateProjectStatus = catchAsync(async (req, res) => {
	const { status } = req.body;
	
	const project = await Project.updateProjectStatus(req.params.projectId, status, req.user.id);

	// Send notification to client
	await Notification.createNotification({
		title: 'Project Status Update',
		message: `Project "${project.name}" status has been updated to ${status}`,
		type: 'info',
		recipient: project.client._id,
		relatedEntity: {
			type: 'project',
			id: project._id
		},
		priority: 'medium'
	});

	// Send WhatsApp/SMS notification
	try {
		await messagingService.sendProjectUpdate(
			project.client.phone,
			project.name,
			'status_change',
			{ status, notes: `Project status updated to ${status}` }
		);
	} catch (error) {
		console.error('Failed to send project update notification:', error);
	}

	res.json({
		success: true,
		message: 'Project status updated successfully',
		data: project
	});
});

const addMilestone = catchAsync(async (req, res) => {
	const milestoneData = req.body;
	
	const project = await Project.addMilestone(req.params.projectId, milestoneData, req.user.id);

	// Create notification for client
	await Notification.createNotification({
		title: 'New Milestone Added',
		message: `New milestone "${milestoneData.name}" added to project "${project.name}"`,
		type: 'info',
		recipient: project.client._id,
		relatedEntity: {
			type: 'project',
			id: project._id
		},
		priority: 'medium'
	});

	res.json({
		success: true,
		message: 'Milestone added successfully',
		data: project
	});
});

const updateMilestone = catchAsync(async (req, res) => {
	const { milestoneId, updateData } = req.body;
	
	const project = await Project.updateMilestone(req.params.projectId, milestoneId, updateData, req.user.id);

	// Create notification for client if milestone is completed
	const milestone = project.milestones.id(milestoneId);
	if (milestone && updateData.status === 'completed') {
		await Notification.createNotification({
			title: 'Milestone Completed',
			message: `Milestone "${milestone.name}" has been completed for project "${project.name}"`,
			type: 'success',
			recipient: project.client._id,
			relatedEntity: {
				type: 'project',
				id: project._id
			},
			priority: 'high'
		});

		// Send WhatsApp/SMS notification
		try {
			await messagingService.sendProjectUpdate(
				project.client.phone,
				project.name,
				'milestone_completed',
				{ milestoneName: milestone.name, notes: 'Milestone completed successfully!' }
			);
		} catch (error) {
			console.error('Failed to send milestone notification:', error);
		}
	}

	res.json({
		success: true,
		message: 'Milestone updated successfully',
		data: project
	});
});

const updateProgress = catchAsync(async (req, res) => {
	const { percentage } = req.body;
	
	const project = await Project.updateProgress(req.params.projectId, percentage);

	// Create notification for client if significant progress
	if (percentage >= 25 && percentage % 25 === 0) {
		await Notification.createNotification({
			title: 'Project Progress Update',
			message: `Project "${project.name}" is now ${percentage}% complete`,
			type: 'info',
			recipient: project.client._id,
			relatedEntity: {
				type: 'project',
				id: project._id
			},
			priority: 'medium'
		});
	}

	res.json({
		success: true,
		message: 'Project progress updated successfully',
		data: project
	});
});

const addNote = catchAsync(async (req, res) => {
	const { content } = req.body;
	
	const project = await Project.addNote(req.params.projectId, content, req.user.id);

	res.json({
		success: true,
		message: 'Note added successfully',
		data: project
	});
});

const addDocument = catchAsync(async (req, res) => {
	const { name, type, url, size } = req.body;
	
	const project = await Project.findById(req.params.projectId);
	
	if (!project) {
		throw new APIError('Project not found', httpStatus.NOT_FOUND);
	}

	project.documents.push({
		name,
		type,
		url,
		uploadedBy: req.user.id,
		size
	});

	await project.save();

	// Create notification for client
	await Notification.createNotification({
		title: 'New Document Uploaded',
		message: `New document "${name}" has been uploaded to project "${project.name}"`,
		type: 'info',
		recipient: project.client._id,
		relatedEntity: {
			type: 'project',
			id: project._id
		},
		priority: 'medium'
	});

	res.json({
		success: true,
		message: 'Document added successfully',
		data: project
	});
});

const generateProjectReport = catchAsync(async (req, res) => {
	const project = await Project.getProjectById(req.params.projectId);
	
	if (!project) {
		throw new APIError('Project not found', httpStatus.NOT_FOUND);
	}

	// Generate PDF report
	const pdfResult = await pdfService.generateProjectReportPDF(project);

	// Add PDF to project documents
	project.documents.push({
		name: pdfResult.filename,
		type: 'pdf',
		url: pdfResult.publicUrl,
		uploadedBy: req.user.id,
		size: pdfResult.size
	});
	await project.save();

	res.json({
		success: true,
		message: 'Project report generated successfully',
		data: {
			filename: pdfResult.filename,
			url: pdfResult.publicUrl,
			size: pdfResult.size
		}
	});
});

const getProjectStats = catchAsync(async (req, res) => {
	const stats = await Project.getProjectStats();

	res.json({
		success: true,
		data: stats
	});
});

const searchProjects = catchAsync(async (req, res) => {
	const { query } = req.query;
	
	const projects = await Project.searchProjects(query);

	res.json({
		success: true,
		data: projects
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

const getTeamMemberProjects = catchAsync(async (req, res) => {
	const { userId } = req.params;
	
	const projects = await Project.getProjectsByTeamMember(userId);

	res.json({
		success: true,
		data: projects
	});
});

export default {
	createProject,
	getProjects,
	getProject,
	updateProject,
	deleteProject,
	updateProjectStatus,
	addMilestone,
	updateMilestone,
	updateProgress,
	addNote,
	addDocument,
	generateProjectReport,
	getProjectStats,
	searchProjects,
	getClientProjects,
	getTeamMemberProjects
};
