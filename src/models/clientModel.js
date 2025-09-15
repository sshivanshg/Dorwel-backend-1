import mongoose from 'mongoose';
import paginate from './plugins/paginatePlugin';
import toJSON from './plugins/toJSONPlugin';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';


const clientSchema = mongoose.Schema(
	{
		firstName: {
			type: String,
			required: true,
			trim: true
		},
		lastName: {
			type: String,
			required: true,
			trim: true
		},
		email: {
			type: String,
			required: true,
			trim: true,
			lowercase: true,
			unique: true
		},
		phone: {
			type: String,
			required: true,
			trim: true
		},
		company: {
			type: String,
			trim: true
		},
		avatar: {
			type: String,
			default: 'default-avatar.png'
		},
		dateOfBirth: {
			type: Date
		},
		address: {
			street: {
				type: String,
				trim: true
			},
			city: {
				type: String,
				trim: true
			},
			state: {
				type: String,
				trim: true
			},
			zipCode: {
				type: String,
				trim: true
			},
			country: {
				type: String,
				trim: true,
				default: 'US'
			}
		},
		preferences: {
			communicationMethod: {
				type: String,
				enum: ['email', 'phone', 'whatsapp', 'sms'],
				default: 'email'
			},
			preferredContactTime: {
				type: String,
				enum: ['morning', 'afternoon', 'evening', 'anytime'],
				default: 'anytime'
			},
			timezone: {
				type: String,
				default: 'UTC'
			},
			language: {
				type: String,
				default: 'en'
			}
		},
		status: {
			type: String,
			enum: ['active', 'inactive', 'suspended', 'archived'],
			default: 'active'
		},
		clientType: {
			type: String,
			enum: ['individual', 'business', 'corporate'],
			default: 'individual'
		},
		industry: {
			type: String,
			trim: true
		},
		website: {
			type: String,
			trim: true
		},
		notes: [{
			content: {
				type: String,
				required: true
			},
			createdBy: {
				type: mongoose.SchemaTypes.ObjectId,
				ref: 'users',
				required: true
			},
			createdAt: {
				type: Date,
				default: Date.now
			}
		}],
		assignedTo: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'users'
		},
		leadSource: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'leads'
		},
		lastContactDate: {
			type: Date
		},
		nextFollowUpDate: {
			type: Date
		},
		tags: [{
			type: String,
			trim: true
		}],
		customFields: [{
			key: {
				type: String,
				required: true
			},
			value: {
				type: String,
				required: true
			}
		}],
		portalAccess: {
			enabled: {
				type: Boolean,
				default: false
			},
			lastLogin: {
				type: Date
			},
			loginCount: {
				type: Number,
				default: 0
			}
		}
	},
	{
		timestamps: true,
		toJSON: { virtuals: true }
	}
);

clientSchema.plugin(toJSON);
clientSchema.plugin(paginate);

clientSchema.virtual('fullName').get(function () {
	return `${this.firstName} ${this.lastName}`;
});

clientSchema.virtual('fullAddress').get(function () {
	const { street, city, state, zipCode, country } = this.address;
	return `${street}, ${city}, ${state} ${zipCode}, ${country}`;
});

class ClientClass {
	static async getClientById(id) {
		return await this.findById(id)
			.populate('assignedTo', 'firstName lastName email avatar')
			.populate('leadSource', 'firstName lastName email projectType');
	}

	static async getClientsByStatus(status) {
		return await this.find({ status }).populate('assignedTo', 'firstName lastName email avatar');
	}

	static async getClientsByAssignedUser(userId) {
		return await this.find({ assignedTo: userId }).populate('assignedTo', 'firstName lastName email avatar');
	}

	static async searchClients(query) {
		const searchRegex = new RegExp(query, 'i');
		return await this.find({
			$or: [
				{ firstName: searchRegex },
				{ lastName: searchRegex },
				{ email: searchRegex },
				{ company: searchRegex },
				{ 'address.city': searchRegex },
				{ 'address.state': searchRegex },
				{ industry: searchRegex }
			]
		}).populate('assignedTo', 'firstName lastName email avatar');
	}

	static async updateClientStatus(clientId, status, userId) {
		const client = await this.findById(clientId);
		if (!client) {
			throw new APIError('Client not found', httpStatus.NOT_FOUND);
		}

		client.status = status;

		// Add status change note
		client.notes.push({
			content: `Status changed to ${status}`,
			createdBy: userId
		});

		return await client.save();
	}

	static async addNote(clientId, content, userId) {
		const client = await this.findById(clientId);
		if (!client) {
			throw new APIError('Client not found', httpStatus.NOT_FOUND);
		}

		client.notes.push({
			content,
			createdBy: userId
		});

		return await client.save();
	}

	static async updatePortalAccess(clientId, enabled) {
		const client = await this.findById(clientId);
		if (!client) {
			throw new APIError('Client not found', httpStatus.NOT_FOUND);
		}

		client.portalAccess.enabled = enabled;
		if (enabled) {
			client.portalAccess.lastLogin = new Date();
			client.portalAccess.loginCount += 1;
		}

		return await client.save();
	}

	static async getClientStats() {
		const stats = await this.aggregate([
			{
				$group: {
					_id: '$status',
					count: { $sum: 1 }
				}
			}
		]);

		const totalClients = await this.countDocuments();
		const activeClients = await this.countDocuments({ status: 'active' });
		const portalEnabledClients = await this.countDocuments({ 'portalAccess.enabled': true });

		return {
			byStatus: stats,
			totalClients,
			activeClients,
			portalEnabledClients
		};
	}
}

clientSchema.loadClass(ClientClass);

const Client = mongoose.model('clients', clientSchema);

export default Client;
