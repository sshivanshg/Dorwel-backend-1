import mongoose from 'mongoose';
import paginate from './plugins/paginatePlugin';
import toJSON from './plugins/toJSONPlugin';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';

const leadSchema = mongoose.Schema(
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
			lowercase: true
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
		projectType: {
			type: String,
			required: true,
			enum: ['residential', 'commercial', 'hospitality', 'retail', 'office', 'other'],
			default: 'residential'
		},
		projectSize: {
			type: String,
			enum: ['small', 'medium', 'large', 'extra-large'],
			default: 'medium'
		},
		budget: {
			type: Number,
			min: 0
		},
		location: {
			address: {
				type: String,
				required: true,
				trim: true
			},
			city: {
				type: String,
				required: true,
				trim: true
			},
			state: {
				type: String,
				required: true,
				trim: true
			},
			zipCode: {
				type: String,
				trim: true
			},
			country: {
				type: String,
				required: true,
				trim: true,
				default: 'US'
			}
		},
		projectDescription: {
			type: String,
			required: true,
			trim: true
		},
		preferredContactMethod: {
			type: String,
			enum: ['email', 'phone', 'whatsapp', 'sms'],
			default: 'email'
		},
		preferredContactTime: {
			type: String,
			enum: ['morning', 'afternoon', 'evening', 'anytime'],
			default: 'anytime'
		},
		status: {
			type: String,
			enum: ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'],
			default: 'new'
		},
		priority: {
			type: String,
			enum: ['low', 'medium', 'high', 'urgent'],
			default: 'medium'
		},
		source: {
			type: String,
			enum: ['website', 'referral', 'social_media', 'advertisement', 'cold_call', 'other'],
			default: 'website'
		},
		assignedTo: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'users'
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
		lastContactDate: {
			type: Date
		},
		nextFollowUpDate: {
			type: Date
		},
		conversionDate: {
			type: Date
		},
		convertedToProject: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'projects'
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
		}]
	},
	{
		timestamps: true,
		toJSON: { virtuals: true }
	}
);

leadSchema.plugin(toJSON);
leadSchema.plugin(paginate);

leadSchema.virtual('fullName').get(function () {
	return `${this.firstName} ${this.lastName}`;
});

leadSchema.virtual('fullAddress').get(function () {
	const { address, city, state, zipCode, country } = this.location;
	return `${address}, ${city}, ${state} ${zipCode}, ${country}`;
});

class LeadClass {
	static async getLeadById(id) {
		return await this.findById(id).populate('assignedTo', 'firstName lastName email avatar');
	}

	static async getLeadsByStatus(status) {
		return await this.find({ status }).populate('assignedTo', 'firstName lastName email avatar');
	}

	static async getLeadsByAssignedUser(userId) {
		return await this.find({ assignedTo: userId }).populate('assignedTo', 'firstName lastName email avatar');
	}

	static async getLeadsByDateRange(startDate, endDate) {
		return await this.find({
			createdAt: {
				$gte: startDate,
				$lte: endDate
			}
		}).populate('assignedTo', 'firstName lastName email avatar');
	}

	static async searchLeads(query) {
		const searchRegex = new RegExp(query, 'i');
		return await this.find({
			$or: [
				{ firstName: searchRegex },
				{ lastName: searchRegex },
				{ email: searchRegex },
				{ company: searchRegex },
				{ 'location.city': searchRegex },
				{ 'location.state': searchRegex },
				{ projectDescription: searchRegex }
			]
		}).populate('assignedTo', 'firstName lastName email avatar');
	}

	static async updateLeadStatus(leadId, status, userId) {
		const lead = await this.findById(leadId);
		if (!lead) {
			throw new APIError('Lead not found', httpStatus.NOT_FOUND);
		}

		lead.status = status;
		if (status === 'converted') {
			lead.conversionDate = new Date();
		}

		// Add status change note
		lead.notes.push({
			content: `Status changed to ${status}`,
			createdBy: userId
		});

		return await lead.save();
	}

	static async addNote(leadId, content, userId) {
		const lead = await this.findById(leadId);
		if (!lead) {
			throw new APIError('Lead not found', httpStatus.NOT_FOUND);
		}

		lead.notes.push({
			content,
			createdBy: userId
		});

		return await lead.save();
	}

	static async convertToProject(leadId, projectId) {
		const lead = await this.findById(leadId);
		if (!lead) {
			throw new APIError('Lead not found', httpStatus.NOT_FOUND);
		}

		lead.status = 'converted';
		lead.convertedToProject = projectId;
		lead.conversionDate = new Date();

		return await lead.save();
	}

	static async getLeadStats() {
		const stats = await this.aggregate([
			{
				$group: {
					_id: '$status',
					count: { $sum: 1 }
				}
			}
		]);

		const totalLeads = await this.countDocuments();
		const convertedLeads = await this.countDocuments({ status: 'converted' });
		const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

		return {
			byStatus: stats,
			totalLeads,
			convertedLeads,
			conversionRate: Math.round(conversionRate * 100) / 100
		};
	}
}

leadSchema.loadClass(LeadClass);

const Lead = mongoose.model('leads', leadSchema);

export default Lead;
