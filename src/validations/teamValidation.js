import Joi from 'joi';

const createTeam = {
	body: Joi.object().keys({
		name: Joi.string().required().trim().min(2).max(100),
		description: Joi.string().trim().max(500).allow(''),
		teamType: Joi.string().valid('design', 'project', 'department', 'client_service', 'management').default('project'),
		status: Joi.string().valid('active', 'inactive', 'archived').default('active'),
		parentTeam: Joi.string().hex().length(24).allow(null),
		settings: Joi.object().keys({
			allowMemberInvites: Joi.boolean().default(true),
			requireApprovalForJoins: Joi.boolean().default(false),
			allowCrossTeamAccess: Joi.boolean().default(false),
			notificationSettings: Joi.object().keys({
				email: Joi.boolean().default(true),
				whatsapp: Joi.boolean().default(false),
				sms: Joi.boolean().default(false)
			})
		}),
		tags: Joi.array().items(Joi.string().trim().max(50))
	})
};

const updateTeam = {
	params: Joi.object().keys({
		teamId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		name: Joi.string().trim().min(2).max(100),
		description: Joi.string().trim().max(500).allow(''),
		teamType: Joi.string().valid('design', 'project', 'department', 'client_service', 'management'),
		status: Joi.string().valid('active', 'inactive', 'archived'),
		parentTeam: Joi.string().hex().length(24).allow(null),
		settings: Joi.object().keys({
			allowMemberInvites: Joi.boolean(),
			requireApprovalForJoins: Joi.boolean(),
			allowCrossTeamAccess: Joi.boolean(),
			notificationSettings: Joi.object().keys({
				email: Joi.boolean(),
				whatsapp: Joi.boolean(),
				sms: Joi.boolean()
			})
		}),
		tags: Joi.array().items(Joi.string().trim().max(50))
	}).min(1)
};

const addMember = {
	params: Joi.object().keys({
		teamId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		userId: Joi.string().hex().length(24).required(),
		role: Joi.string().valid('team_lead', 'senior_member', 'member', 'contributor', 'observer').required(),
		permissions: Joi.array().items(Joi.object().keys({
			resource: Joi.string().valid('project', 'client', 'lead', 'estimate', 'moodboard', 'team', 'user').required(),
			actions: Joi.array().items(Joi.string().valid('create', 'read', 'update', 'delete', 'assign', 'approve')).required(),
			scope: Joi.string().valid('team', 'own', 'all').default('team')
		})).default([])
	})
};

const removeMember = {
	params: Joi.object().keys({
		teamId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		userId: Joi.string().hex().length(24).required()
	})
};

const updateMemberRole = {
	params: Joi.object().keys({
		teamId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		userId: Joi.string().hex().length(24).required(),
		role: Joi.string().valid('team_lead', 'senior_member', 'member', 'contributor', 'observer').required(),
		permissions: Joi.array().items(Joi.object().keys({
			resource: Joi.string().valid('project', 'client', 'lead', 'estimate', 'moodboard', 'team', 'user').required(),
			actions: Joi.array().items(Joi.string().valid('create', 'read', 'update', 'delete', 'assign', 'approve')).required(),
			scope: Joi.string().valid('team', 'own', 'all').default('team')
		}))
	})
};

const getTeamMembers = {
	params: Joi.object().keys({
		teamId: Joi.string().hex().length(24).required()
	})
};

const getUserTeams = {
	params: Joi.object().keys({
		userId: Joi.string().hex().length(24).required()
	})
};

const getTeamsByType = {
	params: Joi.object().keys({
		teamType: Joi.string().valid('design', 'project', 'department', 'client_service', 'management').required()
	})
};

const checkUserPermission = {
	params: Joi.object().keys({
		teamId: Joi.string().hex().length(24).required()
	}),
	query: Joi.object().keys({
		userId: Joi.string().hex().length(24).required(),
		resource: Joi.string().valid('project', 'client', 'lead', 'estimate', 'moodboard', 'team', 'user').required(),
		action: Joi.string().valid('create', 'read', 'update', 'delete', 'assign', 'approve').required()
	})
};

export default {
	createTeam,
	updateTeam,
	addMember,
	removeMember,
	updateMemberRole,
	getTeamMembers,
	getUserTeams,
	getTeamsByType,
	checkUserPermission
};

