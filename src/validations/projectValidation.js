import Joi from 'joi';

const createProject = {
	body: Joi.object().keys({
		name: Joi.string().required().trim(),
		description: Joi.string().required().trim(),
		client: Joi.string().hex().length(24).required(),
		projectType: Joi.string().valid('residential', 'commercial', 'hospitality', 'retail', 'office', 'other').required(),
		projectSize: Joi.string().valid('small', 'medium', 'large', 'extra-large').required(),
		startDate: Joi.date().required(),
		endDate: Joi.date().allow(null),
		estimatedDuration: Joi.number().required().min(1),
		budget: Joi.object().keys({
			estimated: Joi.number().required().min(0),
			currency: Joi.string().default('USD')
		}).required(),
		location: Joi.object().keys({
			address: Joi.string().required().trim(),
			city: Joi.string().required().trim(),
			state: Joi.string().required().trim(),
			zipCode: Joi.string().trim().allow(''),
			country: Joi.string().default('US').trim()
		}).required(),
		team: Joi.array().items(Joi.object().keys({
			user: Joi.string().hex().length(24).required(),
			role: Joi.string().valid('project_manager', 'designer', 'architect', 'consultant', 'coordinator').required()
		})),
		leadSource: Joi.string().hex().length(24).allow(null),
		tags: Joi.array().items(Joi.string().trim()),
		settings: Joi.object().keys({
			notifications: Joi.object().keys({
				email: Joi.boolean().default(true),
				whatsapp: Joi.boolean().default(false),
				sms: Joi.boolean().default(false)
			}),
			clientPortalAccess: Joi.boolean().default(true),
			weeklyReports: Joi.boolean().default(true)
		})
	})
};

const updateProject = {
	params: Joi.object().keys({
		projectId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		name: Joi.string().trim(),
		description: Joi.string().trim(),
		projectType: Joi.string().valid('residential', 'commercial', 'hospitality', 'retail', 'office', 'other'),
		projectSize: Joi.string().valid('small', 'medium', 'large', 'extra-large'),
		startDate: Joi.date(),
		endDate: Joi.date().allow(null),
		estimatedDuration: Joi.number().min(1),
		budget: Joi.object().keys({
			estimated: Joi.number().min(0),
			actual: Joi.number().min(0),
			currency: Joi.string()
		}),
		location: Joi.object().keys({
			address: Joi.string().trim(),
			city: Joi.string().trim(),
			state: Joi.string().trim(),
			zipCode: Joi.string().trim().allow(''),
			country: Joi.string().trim()
		}),
		team: Joi.array().items(Joi.object().keys({
			user: Joi.string().hex().length(24).required(),
			role: Joi.string().valid('project_manager', 'designer', 'architect', 'consultant', 'coordinator').required()
		})),
		tags: Joi.array().items(Joi.string().trim()),
		settings: Joi.object().keys({
			notifications: Joi.object().keys({
				email: Joi.boolean(),
				whatsapp: Joi.boolean(),
				sms: Joi.boolean()
			}),
			clientPortalAccess: Joi.boolean(),
			weeklyReports: Joi.boolean()
		})
	}).min(1)
};

const updateProjectStatus = {
	params: Joi.object().keys({
		projectId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		status: Joi.string().valid('planning', 'design', 'development', 'review', 'approval', 'execution', 'completed', 'on_hold', 'cancelled').required()
	})
};

const updateProgress = {
	params: Joi.object().keys({
		projectId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		percentage: Joi.number().min(0).max(100).required()
	})
};

const addMilestone = {
	params: Joi.object().keys({
		projectId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		name: Joi.string().required().trim(),
		description: Joi.string().trim().allow(''),
		dueDate: Joi.date().required()
	})
};

const updateMilestone = {
	params: Joi.object().keys({
		projectId: Joi.string().hex().length(24).required(),
		milestoneId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		name: Joi.string().trim(),
		description: Joi.string().trim().allow(''),
		dueDate: Joi.date(),
		status: Joi.string().valid('pending', 'in_progress', 'completed', 'overdue')
	}).min(1)
};

const addNote = {
	params: Joi.object().keys({
		projectId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		content: Joi.string().required().trim()
	})
};

const addDocument = {
	params: Joi.object().keys({
		projectId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		name: Joi.string().required().trim(),
		type: Joi.string().valid('estimate', 'proposal', 'contract', 'moodboard', 'floor_plan', '3d_rendering', 'other').required(),
		url: Joi.string().required().trim(),
		size: Joi.number().min(0)
	})
};

export default {
	createProject,
	updateProject,
	updateProjectStatus,
	updateProgress,
	addMilestone,
	updateMilestone,
	addNote,
	addDocument
};
