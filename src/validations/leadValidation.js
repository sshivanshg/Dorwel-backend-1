import Joi from 'joi';

const createLead = {
	body: Joi.object().keys({
		firstName: Joi.string().required().trim(),
		lastName: Joi.string().required().trim(),
		email: Joi.string().required().email().trim().lowercase(),
		phone: Joi.string().required().trim(),
		company: Joi.string().trim().allow(''),
		projectType: Joi.string().valid('residential', 'commercial', 'hospitality', 'retail', 'office', 'other').default('residential'),
		projectSize: Joi.string().valid('small', 'medium', 'large', 'extra-large').default('medium'),
		budget: Joi.number().min(0).allow(null),
		location: Joi.object().keys({
			address: Joi.string().required().trim(),
			city: Joi.string().required().trim(),
			state: Joi.string().required().trim(),
			zipCode: Joi.string().trim().allow(''),
			country: Joi.string().default('US').trim()
		}).required(),
		projectDescription: Joi.string().required().trim(),
		preferredContactMethod: Joi.string().valid('email', 'phone', 'whatsapp', 'sms').default('email'),
		preferredContactTime: Joi.string().valid('morning', 'afternoon', 'evening', 'anytime').default('anytime'),
		priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
		source: Joi.string().valid('website', 'referral', 'social_media', 'advertisement', 'cold_call', 'other').default('website'),
		assignedTo: Joi.string().hex().length(24).allow(null),
		tags: Joi.array().items(Joi.string().trim()),
		customFields: Joi.array().items(Joi.object().keys({
			key: Joi.string().required(),
			value: Joi.string().required()
		}))
	})
};

const updateLead = {
	params: Joi.object().keys({
		leadId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		firstName: Joi.string().trim(),
		lastName: Joi.string().trim(),
		email: Joi.string().email().trim().lowercase(),
		phone: Joi.string().trim(),
		company: Joi.string().trim().allow(''),
		projectType: Joi.string().valid('residential', 'commercial', 'hospitality', 'retail', 'office', 'other'),
		projectSize: Joi.string().valid('small', 'medium', 'large', 'extra-large'),
		budget: Joi.number().min(0).allow(null),
		location: Joi.object().keys({
			address: Joi.string().trim(),
			city: Joi.string().trim(),
			state: Joi.string().trim(),
			zipCode: Joi.string().trim().allow(''),
			country: Joi.string().trim()
		}),
		projectDescription: Joi.string().trim(),
		preferredContactMethod: Joi.string().valid('email', 'phone', 'whatsapp', 'sms'),
		preferredContactTime: Joi.string().valid('morning', 'afternoon', 'evening', 'anytime'),
		priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
		source: Joi.string().valid('website', 'referral', 'social_media', 'advertisement', 'cold_call', 'other'),
		assignedTo: Joi.string().hex().length(24).allow(null),
		tags: Joi.array().items(Joi.string().trim()),
		customFields: Joi.array().items(Joi.object().keys({
			key: Joi.string().required(),
			value: Joi.string().required()
		}))
	}).min(1)
};

const updateLeadStatus = {
	params: Joi.object().keys({
		leadId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		status: Joi.string().valid('new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost').required()
	})
};

const addNote = {
	params: Joi.object().keys({
		leadId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		content: Joi.string().required().trim()
	})
};

const convertToProject = {
	params: Joi.object().keys({
		leadId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		projectData: Joi.object().keys({
			name: Joi.string().required().trim(),
			description: Joi.string().required().trim(),
			projectType: Joi.string().valid('residential', 'commercial', 'hospitality', 'retail', 'office', 'other').required(),
			projectSize: Joi.string().valid('small', 'medium', 'large', 'extra-large').required(),
			startDate: Joi.date().required(),
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
			tags: Joi.array().items(Joi.string().trim())
		}).required()
	})
};

const sendFollowUp = {
	params: Joi.object().keys({
		leadId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		followUpType: Joi.string().valid('initial_contact', 'qualification', 'proposal_follow_up', 'closing').required(),
		message: Joi.string().required().trim(),
		sendVia: Joi.string().valid('email', 'whatsapp', 'sms').default('email')
	})
};

export default {
	createLead,
	updateLead,
	updateLeadStatus,
	addNote,
	convertToProject,
	sendFollowUp
};
