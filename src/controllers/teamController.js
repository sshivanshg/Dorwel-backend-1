import httpStatus from 'http-status';
import catchAsync from '~/utils/catchAsync';
import APIError from '~/utils/apiError';
import Team from '~/models/teamModel';
import User from '~/models/userModel';
import Notification from '~/models/notificationModel';

const createTeam = catchAsync(async (req, res) => {
	const teamData = {
		...req.body,
		createdBy: req.user.id
	};

	const team = await Team.create(teamData);

	// Add creator as team lead
	await Team.addMember(team._id, {
		user: req.user.id,
		role: 'team_lead',
		permissions: [
			{
				resource: 'project',
				actions: ['create', 'read', 'update', 'delete', 'assign', 'approve'],
				scope: 'team'
			},
			{
				resource: 'client',
				actions: ['create', 'read', 'update', 'delete', 'assign'],
				scope: 'team'
			},
			{
				resource: 'lead',
				actions: ['create', 'read', 'update', 'delete', 'assign'],
				scope: 'team'
			},
			{
				resource: 'estimate',
				actions: ['create', 'read', 'update', 'delete', 'approve'],
				scope: 'team'
			},
			{
				resource: 'moodboard',
				actions: ['create', 'read', 'update', 'delete', 'approve'],
				scope: 'team'
			},
			{
				resource: 'team',
				actions: ['create', 'read', 'update', 'delete', 'assign'],
				scope: 'team'
			}
		],
		addedBy: req.user.id
	});

	// Add creator to user's teams
	await User.addUserToTeam(req.user.id, team._id, 'team_lead');

	res.status(httpStatus.CREATED).json({
		success: true,
		message: 'Team created successfully',
		data: team
	});
});

const getTeams = catchAsync(async (req, res) => {
	const { teamType, status, search, page = 1, limit = 10 } = req.query;
	
	let query = {};
	
	if (teamType) {
		query.teamType = teamType;
	}
	
	if (status) {
		query.status = status;
	}
	
	if (search) {
		const searchRegex = new RegExp(search, 'i');
		query.$or = [
			{ name: searchRegex },
			{ description: searchRegex },
			{ tags: { $in: [searchRegex] } }
		];
	}

	const teams = await Team.paginate(query, {
		page: parseInt(page),
		limit: parseInt(limit),
		populate: [
			{ path: 'members.user', select: 'firstName lastName email avatar' },
			{ path: 'createdBy', select: 'firstName lastName email' }
		],
		sort: { createdAt: -1 }
	});

	res.json({
		success: true,
		data: teams
	});
});

const getTeam = catchAsync(async (req, res) => {
	const team = await Team.getTeamById(req.params.teamId);
	
	if (!team) {
		throw new APIError('Team not found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		data: team
	});
});

const updateTeam = catchAsync(async (req, res) => {
	const team = await Team.findByIdAndUpdate(
		req.params.teamId,
		req.body,
		{ new: true, runValidators: true }
	).populate('members.user', 'firstName lastName email avatar');

	if (!team) {
		throw new APIError('Team not found', httpStatus.NOT_FOUND);
	}

	res.json({
		success: true,
		message: 'Team updated successfully',
		data: team
	});
});

const deleteTeam = catchAsync(async (req, res) => {
	const team = await Team.findByIdAndDelete(req.params.teamId);

	if (!team) {
		throw new APIError('Team not found', httpStatus.NOT_FOUND);
	}

	// Remove all users from this team
	const users = await User.find({ 'teams.team': req.params.teamId });
	for (const user of users) {
		await User.removeUserFromTeam(user._id, req.params.teamId);
	}

	res.json({
		success: true,
		message: 'Team deleted successfully'
	});
});

const addMember = catchAsync(async (req, res) => {
	const { userId, role, permissions } = req.body;
	
	// Add member to team
	await Team.addMember(req.params.teamId, {
		user: userId,
		role,
		permissions: permissions || [],
		addedBy: req.user.id
	});

	// Add team to user's teams
	await User.addUserToTeam(userId, req.params.teamId, role);

	// Create notification for the new member
	await Notification.createNotification({
		title: 'Added to Team',
		message: `You have been added to team: ${req.body.teamName || 'New Team'}`,
		type: 'info',
		recipient: userId,
		relatedEntity: {
			type: 'team',
			id: req.params.teamId
		},
		priority: 'medium'
	});

	res.json({
		success: true,
		message: 'Member added successfully'
	});
});

const removeMember = catchAsync(async (req, res) => {
	const { userId } = req.body;
	
	// Remove member from team
	await Team.removeMember(req.params.teamId, userId);

	// Remove team from user's teams
	await User.removeUserFromTeam(userId, req.params.teamId);

	// Create notification for the removed member
	await Notification.createNotification({
		title: 'Removed from Team',
		message: `You have been removed from team: ${req.body.teamName || 'Team'}`,
		type: 'warning',
		recipient: userId,
		relatedEntity: {
			type: 'team',
			id: req.params.teamId
		},
		priority: 'medium'
	});

	res.json({
		success: true,
		message: 'Member removed successfully'
	});
});

const updateMemberRole = catchAsync(async (req, res) => {
	const { userId, role, permissions } = req.body;
	
	// Update member role in team
	await Team.updateMemberRole(req.params.teamId, userId, role, permissions);

	// Update user's team role
	await User.updateUserTeamRole(userId, req.params.teamId, role);

	res.json({
		success: true,
		message: 'Member role updated successfully'
	});
});

const getTeamMembers = catchAsync(async (req, res) => {
	const members = await Team.getTeamMembers(req.params.teamId);

	res.json({
		success: true,
		data: members
	});
});

const getUserTeams = catchAsync(async (req, res) => {
	const teams = await User.getUserTeams(req.params.userId);

	res.json({
		success: true,
		data: teams
	});
});

const getTeamStats = catchAsync(async (req, res) => {
	const stats = await Team.getTeamStats();

	res.json({
		success: true,
		data: stats
	});
});

const searchTeams = catchAsync(async (req, res) => {
	const { query } = req.query;
	
	const teams = await Team.searchTeams(query);

	res.json({
		success: true,
		data: teams
	});
});

const getTeamsByUser = catchAsync(async (req, res) => {
	const teams = await Team.getTeamsByUser(req.user.id);

	res.json({
		success: true,
		data: teams
	});
});

const getTeamsByType = catchAsync(async (req, res) => {
	const { teamType } = req.params;
	const teams = await Team.getTeamsByType(teamType);

	res.json({
		success: true,
		data: teams
	});
});

const checkUserPermission = catchAsync(async (req, res) => {
	const { teamId, userId, resource, action } = req.query;
	
	const hasPermission = await Team.canUserAccessResource(teamId, userId, resource, action);

	res.json({
		success: true,
		data: {
			hasPermission,
			teamId,
			userId,
			resource,
			action
		}
	});
});

export default {
	createTeam,
	getTeams,
	getTeam,
	updateTeam,
	deleteTeam,
	addMember,
	removeMember,
	updateMemberRole,
	getTeamMembers,
	getUserTeams,
	getTeamStats,
	searchTeams,
	getTeamsByUser,
	getTeamsByType,
	checkUserPermission
};
