import Joi from 'joi';

const createMoodboard = {
	body: Joi.object().keys({
		title: Joi.string().required().trim(),
		description: Joi.string().trim().allow(''),
		project: Joi.string().hex().length(24).required(),
		client: Joi.string().hex().length(24).required(),
		items: Joi.array().items(Joi.object().keys({
			type: Joi.string().valid('image', 'color', 'text', 'shape', 'pattern', 'material', 'furniture', 'lighting', 'decor').required(),
			name: Joi.string().required().trim(),
			description: Joi.string().trim().allow(''),
			image: Joi.object().keys({
				url: Joi.string().required().trim(),
				thumbnail: Joi.string().trim().allow(''),
				alt: Joi.string().trim().allow(''),
				width: Joi.number().min(0),
				height: Joi.number().min(0)
			}),
			position: Joi.object().keys({
				x: Joi.number().default(0),
				y: Joi.number().default(0),
				z: Joi.number().default(0)
			}),
			size: Joi.object().keys({
				width: Joi.number().default(200),
				height: Joi.number().default(200)
			}),
			rotation: Joi.number().min(0).max(360).default(0),
			opacity: Joi.number().min(0).max(1).default(1),
			colors: Joi.array().items(Joi.object().keys({
				hex: Joi.string().required(),
				rgb: Joi.object().keys({
					r: Joi.number().min(0).max(255),
					g: Joi.number().min(0).max(255),
					b: Joi.number().min(0).max(255)
				}),
				hsl: Joi.object().keys({
					h: Joi.number().min(0).max(360),
					s: Joi.number().min(0).max(100),
					l: Joi.number().min(0).max(100)
				})
			})),
			metadata: Joi.object().keys({
				source: Joi.string().trim().allow(''),
				url: Joi.string().uri().trim().allow(''),
				price: Joi.number().min(0),
				currency: Joi.string().default('USD'),
				vendor: Joi.string().trim().allow(''),
				sku: Joi.string().trim().allow(''),
				availability: Joi.string().valid('in_stock', 'out_of_stock', 'discontinued', 'unknown').default('unknown')
			}),
			tags: Joi.array().items(Joi.string().trim())
		})),
		layout: Joi.object().keys({
			width: Joi.number().default(1200),
			height: Joi.number().default(800),
			background: Joi.object().keys({
				type: Joi.string().valid('color', 'image', 'gradient').default('color'),
				color: Joi.string().default('#ffffff'),
				image: Joi.object().keys({
					url: Joi.string().trim().allow(''),
					opacity: Joi.number().min(0).max(1).default(1)
				}),
				gradient: Joi.object().keys({
					colors: Joi.array().items(Joi.string()),
					direction: Joi.string().valid('horizontal', 'vertical', 'diagonal').default('horizontal')
				})
			}),
			grid: Joi.object().keys({
				enabled: Joi.boolean().default(false),
				size: Joi.number().default(20),
				color: Joi.string().default('#cccccc'),
				opacity: Joi.number().min(0).max(1).default(0.5)
			})
		}),
		tags: Joi.array().items(Joi.string().trim()),
		settings: Joi.object().keys({
			allowComments: Joi.boolean().default(true),
			allowDownload: Joi.boolean().default(true),
			allowEdit: Joi.boolean().default(false),
			notifications: Joi.object().keys({
				onComment: Joi.boolean().default(true),
				onApproval: Joi.boolean().default(true)
			})
		})
	})
};

const updateMoodboard = {
	params: Joi.object().keys({
		moodboardId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		title: Joi.string().trim(),
		description: Joi.string().trim().allow(''),
		items: Joi.array().items(Joi.object().keys({
			type: Joi.string().valid('image', 'color', 'text', 'shape', 'pattern', 'material', 'furniture', 'lighting', 'decor'),
			name: Joi.string().trim(),
			description: Joi.string().trim().allow(''),
			image: Joi.object().keys({
				url: Joi.string().trim(),
				thumbnail: Joi.string().trim().allow(''),
				alt: Joi.string().trim().allow(''),
				width: Joi.number().min(0),
				height: Joi.number().min(0)
			}),
			position: Joi.object().keys({
				x: Joi.number(),
				y: Joi.number(),
				z: Joi.number()
			}),
			size: Joi.object().keys({
				width: Joi.number(),
				height: Joi.number()
			}),
			rotation: Joi.number().min(0).max(360),
			opacity: Joi.number().min(0).max(1),
			colors: Joi.array().items(Joi.object().keys({
				hex: Joi.string(),
				rgb: Joi.object().keys({
					r: Joi.number().min(0).max(255),
					g: Joi.number().min(0).max(255),
					b: Joi.number().min(0).max(255)
				}),
				hsl: Joi.object().keys({
					h: Joi.number().min(0).max(360),
					s: Joi.number().min(0).max(100),
					l: Joi.number().min(0).max(100)
				})
			})),
			metadata: Joi.object().keys({
				source: Joi.string().trim().allow(''),
				url: Joi.string().uri().trim().allow(''),
				price: Joi.number().min(0),
				currency: Joi.string(),
				vendor: Joi.string().trim().allow(''),
				sku: Joi.string().trim().allow(''),
				availability: Joi.string().valid('in_stock', 'out_of_stock', 'discontinued', 'unknown')
			}),
			tags: Joi.array().items(Joi.string().trim())
		})),
		layout: Joi.object().keys({
			width: Joi.number(),
			height: Joi.number(),
			background: Joi.object().keys({
				type: Joi.string().valid('color', 'image', 'gradient'),
				color: Joi.string(),
				image: Joi.object().keys({
					url: Joi.string().trim().allow(''),
					opacity: Joi.number().min(0).max(1)
				}),
				gradient: Joi.object().keys({
					colors: Joi.array().items(Joi.string()),
					direction: Joi.string().valid('horizontal', 'vertical', 'diagonal')
				})
			}),
			grid: Joi.object().keys({
				enabled: Joi.boolean(),
				size: Joi.number(),
				color: Joi.string(),
				opacity: Joi.number().min(0).max(1)
			})
		}),
		tags: Joi.array().items(Joi.string().trim()),
		settings: Joi.object().keys({
			allowComments: Joi.boolean(),
			allowDownload: Joi.boolean(),
			allowEdit: Joi.boolean(),
			notifications: Joi.object().keys({
				onComment: Joi.boolean(),
				onApproval: Joi.boolean()
			})
		})
	}).min(1)
};

const updateMoodboardStatus = {
	params: Joi.object().keys({
		moodboardId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		status: Joi.string().valid('draft', 'shared', 'approved', 'rejected', 'archived').required()
	})
};

const addItem = {
	params: Joi.object().keys({
		moodboardId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		type: Joi.string().valid('image', 'color', 'text', 'shape', 'pattern', 'material', 'furniture', 'lighting', 'decor').required(),
		name: Joi.string().required().trim(),
		description: Joi.string().trim().allow(''),
		image: Joi.object().keys({
			url: Joi.string().required().trim(),
			thumbnail: Joi.string().trim().allow(''),
			alt: Joi.string().trim().allow(''),
			width: Joi.number().min(0),
			height: Joi.number().min(0)
		}),
		position: Joi.object().keys({
			x: Joi.number().default(0),
			y: Joi.number().default(0),
			z: Joi.number().default(0)
		}),
		size: Joi.object().keys({
			width: Joi.number().default(200),
			height: Joi.number().default(200)
		}),
		rotation: Joi.number().min(0).max(360).default(0),
		opacity: Joi.number().min(0).max(1).default(1),
		colors: Joi.array().items(Joi.object().keys({
			hex: Joi.string().required(),
			rgb: Joi.object().keys({
				r: Joi.number().min(0).max(255),
				g: Joi.number().min(0).max(255),
				b: Joi.number().min(0).max(255)
			}),
			hsl: Joi.object().keys({
				h: Joi.number().min(0).max(360),
				s: Joi.number().min(0).max(100),
				l: Joi.number().min(0).max(100)
			})
		})),
		metadata: Joi.object().keys({
			source: Joi.string().trim().allow(''),
			url: Joi.string().uri().trim().allow(''),
			price: Joi.number().min(0),
			currency: Joi.string().default('USD'),
			vendor: Joi.string().trim().allow(''),
			sku: Joi.string().trim().allow(''),
			availability: Joi.string().valid('in_stock', 'out_of_stock', 'discontinued', 'unknown').default('unknown')
		}),
		tags: Joi.array().items(Joi.string().trim())
	})
};

const updateItem = {
	params: Joi.object().keys({
		moodboardId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		itemId: Joi.string().hex().length(24).required(),
		updateData: Joi.object().keys({
			name: Joi.string().trim(),
			description: Joi.string().trim().allow(''),
			position: Joi.object().keys({
				x: Joi.number(),
				y: Joi.number(),
				z: Joi.number()
			}),
			size: Joi.object().keys({
				width: Joi.number(),
				height: Joi.number()
			}),
			rotation: Joi.number().min(0).max(360),
			opacity: Joi.number().min(0).max(1),
			colors: Joi.array().items(Joi.object().keys({
				hex: Joi.string(),
				rgb: Joi.object().keys({
					r: Joi.number().min(0).max(255),
					g: Joi.number().min(0).max(255),
					b: Joi.number().min(0).max(255)
				}),
				hsl: Joi.object().keys({
					h: Joi.number().min(0).max(360),
					s: Joi.number().min(0).max(100),
					l: Joi.number().min(0).max(100)
				})
			})),
			metadata: Joi.object().keys({
				source: Joi.string().trim().allow(''),
				url: Joi.string().uri().trim().allow(''),
				price: Joi.number().min(0),
				currency: Joi.string(),
				vendor: Joi.string().trim().allow(''),
				sku: Joi.string().trim().allow(''),
				availability: Joi.string().valid('in_stock', 'out_of_stock', 'discontinued', 'unknown')
			}),
			tags: Joi.array().items(Joi.string().trim())
		}).min(1)
	})
};

const addComment = {
	params: Joi.object().keys({
		moodboardId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		content: Joi.string().required().trim(),
		position: Joi.object().keys({
			x: Joi.number(),
			y: Joi.number()
		}),
		itemId: Joi.string().hex().length(24).allow(null)
	})
};

const addReply = {
	params: Joi.object().keys({
		moodboardId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		commentId: Joi.string().hex().length(24).required(),
		replyData: Joi.object().keys({
			content: Joi.string().required().trim()
		})
	})
};

const generateShareToken = {
	params: Joi.object().keys({
		moodboardId: Joi.string().hex().length(24).required()
	}),
	body: Joi.object().keys({
		isPublic: Joi.boolean().default(false),
		password: Joi.string().trim().allow(''),
		expiresAt: Joi.date().allow(null)
	})
};

const generateAISuggestions = {
	body: Joi.object().keys({
		projectDescription: Joi.string().required().trim(),
		style: Joi.string().trim().allow(''),
		colorScheme: Joi.string().trim().allow(''),
		budget: Joi.number().min(0).allow(null)
	})
};

const createMoodboardFromAI = {
	body: Joi.object().keys({
		projectId: Joi.string().hex().length(24).required(),
		clientId: Joi.string().hex().length(24).required(),
		title: Joi.string().required().trim(),
		description: Joi.string().required().trim(),
		aiSuggestions: Joi.object().keys({
			suggestions: Joi.array().items(Joi.object().keys({
				type: Joi.string().required(),
				name: Joi.string().required(),
				description: Joi.string().required(),
				colors: Joi.array().items(Joi.string()),
				materials: Joi.array().items(Joi.string()),
				style: Joi.string(),
				mood: Joi.string(),
				placement: Joi.string(),
				budgetRange: Joi.string().valid('low', 'medium', 'high')
			})).required(),
			overallTheme: Joi.string(),
			colorPalette: Joi.array().items(Joi.string()),
			materials: Joi.array().items(Joi.string()),
			furnitureStyle: Joi.string()
		}).required()
	})
};

export default {
	createMoodboard,
	updateMoodboard,
	updateMoodboardStatus,
	addItem,
	updateItem,
	addComment,
	addReply,
	generateShareToken,
	generateAISuggestions,
	createMoodboardFromAI
};
