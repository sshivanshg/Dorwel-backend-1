import Joi from 'joi';

const createClient = {
	body: Joi.object().keys({
		firstName: Joi.string().required().trim(),
		lastName: Joi.string().required().trim(),
		email: Joi.string().required().email().trim().lowercase(),
		phone: Joi.string().required().trim(),
		company: Joi.string().trim().allow(''),
		avatar: Joi.string().trim().allow(''),
		dateOfBirth: Joi.date().allow(null),
		address: Joi.object().keys({
			street: Joi.string().trim().allow(''),
			city: Joi.string().trim().allow(''),
			state: Joi.string().trim().allow(''),
			zipCode: Joi.string().trim().allow(''),
			country: Joi.string().default('US').trim()
		}),
		preferences: Joi.object().keys({
			communicationMethod: Joi.string().valid('email', 'phone', 'whatsapp', 'sms').default('email'),
			preferredContactTime: Joi.string().valid('morning', 'afternoon', 'evening', 'anytime').default('anytime'),
			timezone: Joi.string().default('UTC'),
			language: Joi.string().default('en')
		}),
		clientType: Joi.string().valid('individual', 'business', 'corporate').default('individual'),
		industry: Joi.string().trim().allow(''),
		website: Joi.string().uri().trim().allow(''),
		assignedTo: Joi.string().hex().length(24).allow(null),
		leadSource: Joi.string().hex().length(24).allow(null),
		tags: Joi.array().items(Joi.string().trim()),
		customFields: Joi.array().items(Joi.object().keys({
			key: Joi.string().required(),
			value: Joi.string().required()
		}))
	})
};

const updateClient = {
	params: Joi.object().keys({
		clientId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		firstName: Joi.string().trim(),
		lastName: Joi.string().trim(),
		email: Joi.string().email().trim().lowercase(),
		phone: Joi.string().trim(),
		company: Joi.string().trim().allow(''),
		avatar: Joi.string().trim().allow(''),
		dateOfBirth: Joi.date().allow(null),
		address: Joi.object().keys({
			street: Joi.string().trim().allow(''),
			city: Joi.string().trim().allow(''),
			state: Joi.string().trim().allow(''),
			zipCode: Joi.string().trim().allow(''),
			country: Joi.string().trim()
		}),
		preferences: Joi.object().keys({
			communicationMethod: Joi.string().valid('email', 'phone', 'whatsapp', 'sms'),
			preferredContactTime: Joi.string().valid('morning', 'afternoon', 'evening', 'anytime'),
			timezone: Joi.string(),
			language: Joi.string()
		}),
		clientType: Joi.string().valid('individual', 'business', 'corporate'),
		industry: Joi.string().trim().allow(''),
		website: Joi.string().uri().trim().allow(''),
		assignedTo: Joi.string().hex().length(24).allow(null),
		tags: Joi.array().items(Joi.string().trim()),
		customFields: Joi.array().items(Joi.object().keys({
			key: Joi.string().required(),
			value: Joi.string().required()
		}))
	}).min(1)
};

const updateClientStatus = {
	params: Joi.object().keys({
		clientId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		status: Joi.string().valid('active', 'inactive', 'suspended', 'archived').required()
	})
};

const addNote = {
	params: Joi.object().keys({
		clientId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		content: Joi.string().required().trim()
	})
};

const updatePortalAccess = {
	params: Joi.object().keys({
		clientId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		enabled: Joi.boolean().required()
	})
};

const sendMessage = {
	params: Joi.object().keys({
		clientId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		message: Joi.string().required().trim(),
		method: Joi.string().valid('email', 'whatsapp', 'sms').default('whatsapp')
	})
};

const scheduleAppointment = {
	params: Joi.object().keys({
		clientId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		appointmentDate: Joi.date().required(),
		appointmentTime: Joi.string().required().trim(),
		location: Joi.string().required().trim(),
		notes: Joi.string().trim().allow('')
	})
};

const updatePreferences = {
	params: Joi.object().keys({
		clientId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		communicationMethod: Joi.string().valid('email', 'phone', 'whatsapp', 'sms'),
		preferredContactTime: Joi.string().valid('morning', 'afternoon', 'evening', 'anytime'),
		timezone: Joi.string(),
		language: Joi.string()
	}).min(1)
};

const addCustomField = {
	params: Joi.object().keys({
		clientId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		key: Joi.string().required().trim(),
		value: Joi.string().required().trim()
	})
};

const removeCustomField = {
	params: Joi.object().keys({
		clientId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		key: Joi.string().required().trim()
	})
};

export default {
	createClient,
	updateClient,
	updateClientStatus,
	addNote,
	updatePortalAccess,
	sendMessage,
	scheduleAppointment,
	updatePreferences,
	addCustomField,
	removeCustomField
};
