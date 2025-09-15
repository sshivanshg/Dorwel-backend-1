import mongoose from 'mongoose';
import paginate from './plugins/paginatePlugin';
import toJSON from './plugins/toJSONPlugin';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';

const teamSchema = mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true
		},
		description: {
			type: String,
			trim: true
		},
		teamType: {
			type: String,
			enum: ['design', 'project', 'department', 'client_service', 'management'],
			default: 'project'
		},
		status: {
			type: String,
			enum: ['active', 'inactive', 'archived'],
			default: 'active'
		},
		// Team hierarchy
		parentTeam: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'teams'
		},
		// Team members with their roles and permissions
		members: [{
			user: {
				type: mongoose.SchemaTypes.ObjectId,
				ref: 'users',
				required: true
			},
			role: {
				type: String,
				required: true,
				enum: ['team_lead', 'senior_member', 'member', 'contributor', 'observer']
			},
			permissions: [{
				resource: {
					type: String,
					required: true,
					enum: ['project', 'client', 'lead', 'estimate', 'moodboard', 'team', 'user']
				},
				actions: [{
					type: String,
					enum: ['create', 'read', 'update', 'delete', 'assign', 'approve']
				}],
				scope: {
					type: String,
					enum: ['team', 'own', 'all'],
					default: 'team'
				}
			}],
			joinedAt: {
				type: Date,
				default: Date.now
			},
			addedBy: {
				type: mongoose.SchemaTypes.ObjectId,
				ref: 'users',
				required: true
			}
		}],
		// Team settings
		settings: {
			allowMemberInvites: {
				type: Boolean,
				default: true
			},
			requireApprovalForJoins: {
				type: Boolean,
				default: false
			},
			allowCrossTeamAccess: {
				type: Boolean,
				default: false
			},
			notificationSettings: {
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
			}
		},
		// Team resources and projects
		projects: [{
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'projects'
		}],
		clients: [{
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'clients'
		}],
		// Team metadata
		createdBy: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'users',
			required: true
		},
		tags: [{
			type: String,
			trim: true
		}]
	},
	{
		timestamps: true,
		toJSON: { virtuals: true }
	}
);

teamSchema.plugin(toJSON);
teamSchema.plugin(paginate);

// Indexes for better performance
teamSchema.index({ name: 1 });
teamSchema.index({ teamType: 1 });
teamSchema.index({ status: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ createdBy: 1 });

// Virtual for member count
teamSchema.virtual('memberCount').get(function () {
	return this.members.length;
});

// Virtual for active member count
teamSchema.virtual('activeMemberCount').get(function () {
	return this.members.filter(member => member.user && member.user.status !== 'inactive').length;
});

class TeamClass {
	static async getTeamById(id) {
		return await this.findById(id)
			.populate('members.user', 'firstName lastName email avatar')
			.populate('members.addedBy', 'firstName lastName email')
			.populate('createdBy', 'firstName lastName email')
			.populate('parentTeam', 'name description')
			.populate('projects', 'name status')
			.populate('clients', 'firstName lastName company');
	}

	static async getTeamsByUser(userId) {
		return await this.find({ 'members.user': userId })
			.populate('members.user', 'firstName lastName email avatar')
			.populate('createdBy', 'firstName lastName email');
	}

	static async getTeamsByType(teamType) {
		return await this.find({ teamType, status: 'active' })
			.populate('members.user', 'firstName lastName email avatar')
			.populate('createdBy', 'firstName lastName email');
	}

	static async getTeamsByCreator(createdBy) {
		return await this.find({ createdBy })
			.populate('members.user', 'firstName lastName email avatar')
			.populate('createdBy', 'firstName lastName email');
	}

	static async addMember(teamId, memberData) {
		const team = await this.findById(teamId);
		if (!team) {
			throw new APIError('Team not found', httpStatus.NOT_FOUND);
		}

		// Check if user is already a member
		const existingMember = team.members.find(member => 
			member.user.toString() === memberData.user.toString()
		);
		
		if (existingMember) {
			throw new APIError('User is already a member of this team', httpStatus.BAD_REQUEST);
		}

		team.members.push(memberData);
		return await team.save();
	}

	static async removeMember(teamId, userId) {
		const team = await this.findById(teamId);
		if (!team) {
			throw new APIError('Team not found', httpStatus.NOT_FOUND);
		}

		team.members = team.members.filter(member => 
			member.user.toString() !== userId.toString()
		);

		return await team.save();
	}

	static async updateMemberRole(teamId, userId, newRole, newPermissions) {
		const team = await this.findById(teamId);
		if (!team) {
			throw new APIError('Team not found', httpStatus.NOT_FOUND);
		}

		const member = team.members.find(member => 
			member.user.toString() === userId.toString()
		);

		if (!member) {
			throw new APIError('User is not a member of this team', httpStatus.NOT_FOUND);
		}

		member.role = newRole;
		if (newPermissions) {
			member.permissions = newPermissions;
		}

		return await team.save();
	}

	static async getTeamMembers(teamId) {
		const team = await this.findById(teamId)
			.populate('members.user', 'firstName lastName email avatar')
			.populate('members.addedBy', 'firstName lastName email');
		
		if (!team) {
			throw new APIError('Team not found', httpStatus.NOT_FOUND);
		}

		return team.members;
	}

	static async getUserPermissionsInTeam(teamId, userId) {
		const team = await this.findById(teamId);
		if (!team) {
			throw new APIError('Team not found', httpStatus.NOT_FOUND);
		}

		const member = team.members.find(member => 
			member.user.toString() === userId.toString()
		);

		if (!member) {
			return null; // User is not a member of this team
		}

		return {
			role: member.role,
			permissions: member.permissions,
			joinedAt: member.joinedAt
		};
	}

	static async canUserAccessResource(teamId, userId, resource, action) {
		const userPermissions = await this.getUserPermissionsInTeam(teamId, userId);
		
		if (!userPermissions) {
			return false;
		}

		// Check if user has the required permission
		const hasPermission = userPermissions.permissions.some(permission => 
			permission.resource === resource && 
			permission.actions.includes(action)
		);

		return hasPermission;
	}

	static async getTeamStats() {
		const stats = await this.aggregate([
			{
				$group: {
					_id: '$teamType',
					count: { $sum: 1 },
					totalMembers: { $sum: { $size: '$members' } }
				}
			}
		]);

		const totalTeams = await this.countDocuments();
		const activeTeams = await this.countDocuments({ status: 'active' });
		const totalMembers = await this.aggregate([
			{ $unwind: '$members' },
			{ $count: 'totalMembers' }
		]);

		return {
			byType: stats,
			totalTeams,
			activeTeams,
			totalMembers: totalMembers[0]?.totalMembers || 0
		};
	}

	static async searchTeams(query) {
		const searchRegex = new RegExp(query, 'i');
		return await this.find({
			$or: [
				{ name: searchRegex },
				{ description: searchRegex },
				{ tags: { $in: [searchRegex] } }
			]
		})
			.populate('members.user', 'firstName lastName email avatar')
			.populate('createdBy', 'firstName lastName email');
	}
}

teamSchema.loadClass(TeamClass);

const Team = mongoose.model('teams', teamSchema);

export default Team;
