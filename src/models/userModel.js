import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import paginate from './plugins/paginatePlugin';
import toJSON from './plugins/toJSONPlugin';
import APIError from '~/utils/apiError';
import Role from './roleModel';
import config from '~/config/config';
import httpStatus from 'http-status';

const userSchema = mongoose.Schema(
	{
		firstName: {
			type: String,
			required: true
		},
		lastName: {
			type: String,
			required: true
		},
		userName: {
			type: String,
			required: true,
			unique: true
		},
		email: {
			type: String,
			required: true,
			unique: true
		},
		password: {
			type: String,
			required: true,
			private: true
		},
		avatar: {
			type: String,
			default: 'avatar.png'
		},
		confirmed: {
			type: Boolean,
			default: false
		},
		roles: [
			{
				type: mongoose.SchemaTypes.ObjectId,
				ref: 'roles'
			}
		],
		// Team memberships
		teams: [{
			team: {
				type: mongoose.SchemaTypes.ObjectId,
				ref: 'teams',
				required: true
			},
			role: {
				type: String,
				required: true,
				enum: ['team_lead', 'senior_member', 'member', 'contributor', 'observer']
			},
			joinedAt: {
				type: Date,
				default: Date.now
			},
			status: {
				type: String,
				enum: ['active', 'inactive', 'pending'],
				default: 'active'
			}
		}],
		// User preferences
		preferences: {
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
			timezone: {
				type: String,
				default: 'UTC'
			},
			language: {
				type: String,
				default: 'en'
			}
		},
		googleId: {
			type: String,
			unique: true,
			sparse: true
		},
		authProvider: {
			type: String,
			enum: ['local', 'google'],
			default: 'local'
		},
		// Razorpay integration
		razorpayCustomerId: {
			type: String,
			unique: true,
			sparse: true
		},
		// Subscription tracking
		subscriptionStatus: {
			type: String,
			enum: ['trial', 'active', 'expired', 'cancelled', 'none'],
			default: 'none'
		},
		subscriptionExpiry: {
			type: Date
		}
	},
	{
		timestamps: true,
		toJSON: { virtuals: true }
	}
);

userSchema.plugin(toJSON);
userSchema.plugin(paginate);

userSchema.virtual('avatarUrl').get(function () {
	return config.IMAGE_URL + '/' + this.avatar;
});

class UserClass {
	static async isUserNameAlreadyExists(userName, excludeUserId) {
		return !!(await this.findOne({ userName, _id: { $ne: excludeUserId } }));
	}

	static async isEmailAlreadyExists(email, excludeUserId) {
		return !!(await this.findOne({ email, _id: { $ne: excludeUserId } }));
	}

	static async isRoleIdAlreadyExists(roleId, excludeUserId) {
		return !!(await this.findOne({ roles: roleId, _id: { $ne: excludeUserId } }));
	}

	static async getUserById(id) {
		return await this.findById(id);
	}

	static async getUserByIdWithRoles(id) {
		return await this.findById(id).populate({ path: 'roles', select: 'name description createdAt updatedAt' });
	}

	static async getUserByIdWithTeams(id) {
		return await this.findById(id)
			.populate({ path: 'roles', select: 'name description createdAt updatedAt' })
			.populate({ path: 'teams.team', select: 'name description teamType status' });
	}

	static async getUserByUserName(userName) {
		return await this.findOne({ userName });
	}

	static async getUserByEmail(email) {
		return await this.findOne({ email });
	}

	static async createUser(body) {
		if (await this.isUserNameAlreadyExists(body.userName)) {
			throw new APIError('User name already exists', httpStatus.BAD_REQUEST);
		}
		if (await this.isEmailAlreadyExists(body.email)) {
			throw new APIError('Email already exists', httpStatus.BAD_REQUEST);
		}
		if (body.roles) {
			await Promise.all(
				body.roles.map(async (rid) => {
					if (!(await Role.findById(rid))) {
						throw new APIError('Roles not exist', httpStatus.BAD_REQUEST);
					}
				})
			);
		}
		return await this.create(body);
	}

	static async updateUserById(userId, body) {
		const user = await this.getUserById(userId);
		if (!user) {
			throw new APIError('User not found', httpStatus.NOT_FOUND);
		}
		if (await this.isUserNameAlreadyExists(body.userName, userId)) {
			throw new APIError('User name already exists', httpStatus.BAD_REQUEST);
		}
		if (await this.isEmailAlreadyExists(body.email, userId)) {
			throw new APIError('Email already exists', httpStatus.BAD_REQUEST);
		}
		if (body.roles) {
			await Promise.all(
				body.roles.map(async (rid) => {
					if (!(await Role.findById(rid))) {
						throw new APIError('Roles not exist', httpStatus.BAD_REQUEST);
					}
				})
			);
		}
		Object.assign(user, body);
		return await user.save();
	}

	static async deleteUserById(userId) {
		const user = await this.getUserById(userId);
		if (!user) {
			throw new APIError('User not found', httpStatus.NOT_FOUND);
		}
		return await user.remove();
	}

	async isPasswordMatch(password) {
		return bcrypt.compareSync(password, this.password);
	}

	// Team management methods
	static async addUserToTeam(userId, teamId, role = 'member') {
		const user = await this.findById(userId);
		if (!user) {
			throw new APIError('User not found', httpStatus.NOT_FOUND);
		}

		// Check if user is already in the team
		const existingTeam = user.teams.find(team => 
			team.team.toString() === teamId.toString()
		);

		if (existingTeam) {
			throw new APIError('User is already a member of this team', httpStatus.BAD_REQUEST);
		}

		user.teams.push({
			team: teamId,
			role,
			status: 'active'
		});

		return await user.save();
	}

	static async removeUserFromTeam(userId, teamId) {
		const user = await this.findById(userId);
		if (!user) {
			throw new APIError('User not found', httpStatus.NOT_FOUND);
		}

		user.teams = user.teams.filter(team => 
			team.team.toString() !== teamId.toString()
		);

		return await user.save();
	}

	static async updateUserTeamRole(userId, teamId, newRole) {
		const user = await this.findById(userId);
		if (!user) {
			throw new APIError('User not found', httpStatus.NOT_FOUND);
		}

		const teamMembership = user.teams.find(team => 
			team.team.toString() === teamId.toString()
		);

		if (!teamMembership) {
			throw new APIError('User is not a member of this team', httpStatus.NOT_FOUND);
		}

		teamMembership.role = newRole;
		return await user.save();
	}

	static async getUserTeams(userId) {
		const user = await this.findById(userId)
			.populate({
				path: 'teams.team',
				select: 'name description teamType status members'
			});

		if (!user) {
			throw new APIError('User not found', httpStatus.NOT_FOUND);
		}

		return user.teams;
	}

	static async getUsersByTeam(teamId) {
		return await this.find({ 'teams.team': teamId })
			.populate('roles', 'name description')
			.select('firstName lastName email avatar teams');
	}

	static async isUserInTeam(userId, teamId) {
		const user = await this.findById(userId);
		if (!user) {
			return false;
		}

		return user.teams.some(team => 
			team.team.toString() === teamId.toString() && 
			team.status === 'active'
		);
	}

	static async getUserTeamRole(userId, teamId) {
		const user = await this.findById(userId);
		if (!user) {
			return null;
		}

		const teamMembership = user.teams.find(team => 
			team.team.toString() === teamId.toString() && 
			team.status === 'active'
		);

		return teamMembership ? teamMembership.role : null;
	}

	// Subscription management methods
	static async updateSubscriptionStatus(userId, status, expiryDate = null) {
		const user = await this.findById(userId);
		if (!user) {
			throw new APIError('User not found', httpStatus.NOT_FOUND);
		}

		user.subscriptionStatus = status;
		if (expiryDate) {
			user.subscriptionExpiry = expiryDate;
		}

		return await user.save();
	}

	static async getUsersBySubscriptionStatus(status) {
		return await this.find({ subscriptionStatus: status })
			.select('firstName lastName email subscriptionStatus subscriptionExpiry');
	}

	static async getExpiringSubscriptions(days = 7) {
		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + days);

		return await this.find({
			subscriptionStatus: { $in: ['active', 'trial'] },
			subscriptionExpiry: { $lte: futureDate }
		}).select('firstName lastName email subscriptionStatus subscriptionExpiry');
	}

	static async hasActiveSubscription(userId) {
		const user = await this.findById(userId);
		if (!user) {
			return false;
		}

		return ['active', 'trial'].includes(user.subscriptionStatus) && 
			   (!user.subscriptionExpiry || user.subscriptionExpiry > new Date());
	}

	static async getSubscriptionInfo(userId) {
		const user = await this.findById(userId);
		if (!user) {
			return null;
		}

		return {
			status: user.subscriptionStatus,
			expiry: user.subscriptionExpiry,
			isActive: ['active', 'trial'].includes(user.subscriptionStatus) && 
					  (!user.subscriptionExpiry || user.subscriptionExpiry > new Date()),
			razorpayCustomerId: user.razorpayCustomerId
		};
	}
}

userSchema.loadClass(UserClass);

userSchema.pre('save', async function (next) {
	if (this.isModified('password')) {
		const passwordGenSalt = bcrypt.genSaltSync(10);
		this.password = bcrypt.hashSync(this.password, passwordGenSalt);
	}
	next();
});

const User = mongoose.model('users', userSchema);

export default User;
