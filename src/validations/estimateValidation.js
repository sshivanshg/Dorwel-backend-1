import Joi from 'joi';

const createEstimate = {
	body: Joi.object().keys({
		title: Joi.string().required().trim(),
		description: Joi.string().required().trim(),
		client: Joi.string().hex().length(24).required(),
		project: Joi.string().hex().length(24).allow(null),
		lead: Joi.string().hex().length(24).allow(null),
		items: Joi.array().items(Joi.object().keys({
			category: Joi.string().valid('design', 'materials', 'labor', 'furniture', 'lighting', 'decor', 'installation', 'other').required(),
			name: Joi.string().required().trim(),
			description: Joi.string().trim().allow(''),
			quantity: Joi.number().required().min(0),
			unit: Joi.string().valid('each', 'sqft', 'sqm', 'linear_ft', 'hour', 'day', 'week', 'month', 'other').required(),
			unitPrice: Joi.number().required().min(0),
			notes: Joi.string().trim().allow(''),
			isAIGenerated: Joi.boolean().default(false)
		})).required(),
		pricing: Joi.object().keys({
			subtotal: Joi.number().min(0),
			taxRate: Joi.number().min(0).max(100).default(0),
			discountRate: Joi.number().min(0).max(100).default(0),
			currency: Joi.string().default('USD')
		}),
		validity: Joi.object().keys({
			validUntil: Joi.date().required(),
			daysValid: Joi.number().default(30)
		}).required(),
		terms: Joi.object().keys({
			paymentTerms: Joi.string().default('Net 30'),
			depositRequired: Joi.number().min(0).max(100).default(0),
			additionalTerms: Joi.string().trim().allow('')
		})
	})
};

const updateEstimate = {
	params: Joi.object().keys({
		estimateId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		title: Joi.string().trim(),
		description: Joi.string().trim(),
		items: Joi.array().items(Joi.object().keys({
			category: Joi.string().valid('design', 'materials', 'labor', 'furniture', 'lighting', 'decor', 'installation', 'other'),
			name: Joi.string().trim(),
			description: Joi.string().trim().allow(''),
			quantity: Joi.number().min(0),
			unit: Joi.string().valid('each', 'sqft', 'sqm', 'linear_ft', 'hour', 'day', 'week', 'month', 'other'),
			unitPrice: Joi.number().min(0),
			notes: Joi.string().trim().allow(''),
			isAIGenerated: Joi.boolean()
		})),
		pricing: Joi.object().keys({
			subtotal: Joi.number().min(0),
			taxRate: Joi.number().min(0).max(100),
			discountRate: Joi.number().min(0).max(100),
			currency: Joi.string()
		}),
		validity: Joi.object().keys({
			validUntil: Joi.date(),
			daysValid: Joi.number()
		}),
		terms: Joi.object().keys({
			paymentTerms: Joi.string(),
			depositRequired: Joi.number().min(0).max(100),
			additionalTerms: Joi.string().trim().allow('')
		})
	}).min(1)
};

const updateEstimateStatus = {
	params: Joi.object().keys({
		estimateId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		status: Joi.string().valid('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised').required()
	})
};

const addNote = {
	params: Joi.object().keys({
		estimateId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		content: Joi.string().required().trim()
	})
};

const generateAIEstimate = {
	body: Joi.object().keys({
		projectDescription: Joi.string().required().trim(),
		projectType: Joi.string().valid('residential', 'commercial', 'hospitality', 'retail', 'office', 'other').required(),
		projectSize: Joi.string().valid('small', 'medium', 'large', 'extra-large').required(),
		budget: Joi.number().min(0).allow(null)
	})
};

const createEstimateFromAI = {
	body: Joi.object().keys({
		clientId: Joi.string().hex().length(24).required(),
		projectId: Joi.string().hex().length(24).allow(null),
		leadId: Joi.string().hex().length(24).allow(null),
		title: Joi.string().required().trim(),
		description: Joi.string().required().trim(),
		aiEstimate: Joi.object().keys({
			items: Joi.array().items(Joi.object().keys({
				category: Joi.string().required(),
				name: Joi.string().required(),
				description: Joi.string().required(),
				quantity: Joi.number().required(),
				unit: Joi.string().required(),
				unitPrice: Joi.number().required(),
				notes: Joi.string().allow(''),
				isAIGenerated: Joi.boolean().default(true)
			})).required(),
			confidence: Joi.number().min(0).max(1),
			reasoning: Joi.string()
		}).required()
	})
};

const createRevision = {
	params: Joi.object().keys({
		estimateId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		updateData: Joi.object().keys({
			title: Joi.string().trim(),
			description: Joi.string().trim(),
			items: Joi.array().items(Joi.object().keys({
				category: Joi.string().valid('design', 'materials', 'labor', 'furniture', 'lighting', 'decor', 'installation', 'other'),
				name: Joi.string().trim(),
				description: Joi.string().trim().allow(''),
				quantity: Joi.number().min(0),
				unit: Joi.string().valid('each', 'sqft', 'sqm', 'linear_ft', 'hour', 'day', 'week', 'month', 'other'),
				unitPrice: Joi.number().min(0),
				notes: Joi.string().trim().allow(''),
				isAIGenerated: Joi.boolean()
			})),
			pricing: Joi.object().keys({
				subtotal: Joi.number().min(0),
				taxRate: Joi.number().min(0).max(100),
				discountRate: Joi.number().min(0).max(100),
				currency: Joi.string()
			}),
			validity: Joi.object().keys({
				validUntil: Joi.date(),
				daysValid: Joi.number()
			}),
			terms: Joi.object().keys({
				paymentTerms: Joi.string(),
				depositRequired: Joi.number().min(0).max(100),
				additionalTerms: Joi.string().trim().allow('')
			})
		}).min(1)
	})
};

const sendEstimate = {
	params: Joi.object().keys({
		estimateId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		method: Joi.string().valid('email', 'whatsapp', 'sms').required(),
		message: Joi.string().trim().allow('')
	})
};

export default {
	createEstimate,
	updateEstimate,
	updateEstimateStatus,
	addNote,
	generateAIEstimate,
	createEstimateFromAI,
	createRevision,
	sendEstimate
};
