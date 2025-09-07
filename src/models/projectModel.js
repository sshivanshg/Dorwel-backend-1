import mongoose from 'mongoose';
import paginate from './plugins/paginatePlugin';
import toJSON from './plugins/toJSONPlugin';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';

const projectSchema = mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true
		},
		description: {
			type: String,
			required: true,
			trim: true
		},
		client: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'clients',
			required: true
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
		status: {
			type: String,
			enum: ['planning', 'design', 'development', 'review', 'approval', 'execution', 'completed', 'on_hold', 'cancelled'],
			default: 'planning'
		},
		priority: {
			type: String,
			enum: ['low', 'medium', 'high', 'urgent'],
			default: 'medium'
		},
		startDate: {
			type: Date,
			required: true
		},
		endDate: {
			type: Date
		},
		estimatedDuration: {
			type: Number, // in days
			required: true
		},
		budget: {
			estimated: {
				type: Number,
				required: true,
				min: 0
			},
			actual: {
				type: Number,
				default: 0,
				min: 0
			},
			currency: {
				type: String,
				default: 'USD'
			}
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
		team: [{
			user: {
				type: mongoose.SchemaTypes.ObjectId,
				ref: 'users',
				required: true
			},
			role: {
				type: String,
				required: true,
				enum: ['project_manager', 'designer', 'architect', 'consultant', 'coordinator']
			},
			assignedAt: {
				type: Date,
				default: Date.now
			}
		}],
		milestones: [{
			name: {
				type: String,
				required: true
			},
			description: {
				type: String
			},
			dueDate: {
				type: Date,
				required: true
			},
			completedDate: {
				type: Date
			},
			status: {
				type: String,
				enum: ['pending', 'in_progress', 'completed', 'overdue'],
				default: 'pending'
			},
			createdBy: {
				type: mongoose.SchemaTypes.ObjectId,
				ref: 'users',
				required: true
			}
		}],
		documents: [{
			name: {
				type: String,
				required: true
			},
			type: {
				type: String,
				required: true,
				enum: ['estimate', 'proposal', 'contract', 'moodboard', 'floor_plan', '3d_rendering', 'other']
			},
			url: {
				type: String,
				required: true
			},
			uploadedBy: {
				type: mongoose.SchemaTypes.ObjectId,
				ref: 'users',
				required: true
			},
			uploadedAt: {
				type: Date,
				default: Date.now
			},
			size: {
				type: Number
			}
		}],
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
		progress: {
			percentage: {
				type: Number,
				default: 0,
				min: 0,
				max: 100
			},
			lastUpdated: {
				type: Date,
				default: Date.now
			}
		},
		tags: [{
			type: String,
			trim: true
		}],
		settings: {
			notifications: {
				email: {
					type: Boolean,
					default: true
				},
				whatsapp: {
					type: Boolean,
					default: false
				},
				sms: {
					type: Boolean,
					default: false
				}
			},
			clientPortalAccess: {
				type: Boolean,
				default: true
			},
			weeklyReports: {
				type: Boolean,
				default: true
			}
		},
		leadSource: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'leads'
		},
		estimate: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'estimates'
		}
	},
	{
		timestamps: true,
		toJSON: { virtuals: true }
	}
);

projectSchema.plugin(toJSON);
projectSchema.plugin(paginate);

projectSchema.virtual('fullAddress').get(function () {
	const { address, city, state, zipCode, country } = this.location;
	return `${address}, ${city}, ${state} ${zipCode}, ${country}`;
});

projectSchema.virtual('isOverdue').get(function () {
	if (!this.endDate || this.status === 'completed' || this.status === 'cancelled') {
		return false;
	}
	return new Date() > this.endDate;
});

projectSchema.virtual('daysRemaining').get(function () {
	if (!this.endDate || this.status === 'completed' || this.status === 'cancelled') {
		return null;
	}
	const now = new Date();
	const diffTime = this.endDate - now;
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

class ProjectClass {
	static async getProjectById(id) {
		return await this.findById(id)
			.populate('client', 'firstName lastName email phone company')
			.populate('team.user', 'firstName lastName email avatar')
			.populate('leadSource', 'firstName lastName email projectType')
			.populate('estimate', 'totalAmount currency status');
	}

	static async getProjectsByStatus(status) {
		return await this.find({ status })
			.populate('client', 'firstName lastName email phone company')
			.populate('team.user', 'firstName lastName email avatar');
	}

	static async getProjectsByClient(clientId) {
		return await this.find({ client: clientId })
			.populate('team.user', 'firstName lastName email avatar')
			.populate('estimate', 'totalAmount currency status');
	}

	static async getProjectsByTeamMember(userId) {
		return await this.find({ 'team.user': userId })
			.populate('client', 'firstName lastName email phone company')
			.populate('team.user', 'firstName lastName email avatar');
	}

	static async searchProjects(query) {
		const searchRegex = new RegExp(query, 'i');
		return await this.find({
			$or: [
				{ name: searchRegex },
				{ description: searchRegex },
				{ 'location.city': searchRegex },
				{ 'location.state': searchRegex },
				{ tags: { $in: [searchRegex] } }
			]
		})
			.populate('client', 'firstName lastName email phone company')
			.populate('team.user', 'firstName lastName email avatar');
	}

	static async updateProjectStatus(projectId, status, userId) {
		const project = await this.findById(projectId);
		if (!project) {
			throw new APIError('Project not found', httpStatus.NOT_FOUND);
		}

		project.status = status;

		// Add status change note
		project.notes.push({
			content: `Status changed to ${status}`,
			createdBy: userId
		});

		return await project.save();
	}

	static async addMilestone(projectId, milestoneData, userId) {
		const project = await this.findById(projectId);
		if (!project) {
			throw new APIError('Project not found', httpStatus.NOT_FOUND);
		}

		project.milestones.push({
			...milestoneData,
			createdBy: userId
		});

		return await project.save();
	}

	static async updateMilestone(projectId, milestoneId, updateData, userId) {
		const project = await this.findById(projectId);
		if (!project) {
			throw new APIError('Project not found', httpStatus.NOT_FOUND);
		}

		const milestone = project.milestones.id(milestoneId);
		if (!milestone) {
			throw new APIError('Milestone not found', httpStatus.NOT_FOUND);
		}

		Object.assign(milestone, updateData);
		if (updateData.status === 'completed') {
			milestone.completedDate = new Date();
		}

		return await project.save();
	}

	static async addNote(projectId, content, userId) {
		const project = await this.findById(projectId);
		if (!project) {
			throw new APIError('Project not found', httpStatus.NOT_FOUND);
		}

		project.notes.push({
			content,
			createdBy: userId
		});

		return await project.save();
	}

	static async updateProgress(projectId, percentage) {
		const project = await this.findById(projectId);
		if (!project) {
			throw new APIError('Project not found', httpStatus.NOT_FOUND);
		}

		project.progress.percentage = Math.max(0, Math.min(100, percentage));
		project.progress.lastUpdated = new Date();

		return await project.save();
	}

	static async getProjectStats() {
		const stats = await this.aggregate([
			{
				$group: {
					_id: '$status',
					count: { $sum: 1 },
					totalBudget: { $sum: '$budget.estimated' }
				}
			}
		]);

		const totalProjects = await this.countDocuments();
		const completedProjects = await this.countDocuments({ status: 'completed' });
		const activeProjects = await this.countDocuments({ 
			status: { $in: ['planning', 'design', 'development', 'review', 'approval', 'execution'] }
		});

		return {
			byStatus: stats,
			totalProjects,
			completedProjects,
			activeProjects
		};
	}
}

projectSchema.loadClass(ProjectClass);

const Project = mongoose.model('projects', projectSchema);

export default Project;
