import passport from 'passport';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import Role from '~/models/roleModel';
import Team from '~/models/teamModel';
import User from '~/models/userModel';

const verifyCallback = (req, resolve, reject, requiredRights, teamId) => async (err, user, info) => {
	if (err || info || !user) {
		return reject(new APIError(httpStatus[httpStatus.UNAUTHORIZED], httpStatus.UNAUTHORIZED));
	}
	req.user = user;

	if (requiredRights.length) {
		let hasRequiredRights = false;

		// Check global role permissions first
		const userRights = [];
		const roles = await Role.find({ _id: { $in: user.roles } }).populate('permissions');
		roles.forEach((role) => {
			role.permissions.forEach((permission) => {
				userRights.push(`${permission.controller}:${permission.action}`);
			});
		});

		// Check if user has global permissions
		hasRequiredRights = requiredRights.every((right) => userRights.includes(right));

		// If no global permissions and teamId is provided, check team permissions
		if (!hasRequiredRights && teamId) {
			const teamPermissions = await Team.getUserPermissionsInTeam(teamId, user.id);
			
			if (teamPermissions) {
				const teamRights = [];
				teamPermissions.permissions.forEach((permission) => {
					permission.actions.forEach((action) => {
						teamRights.push(`${permission.resource}:${action}`);
					});
				});

				hasRequiredRights = requiredRights.every((right) => teamRights.includes(right));
			}
		}

		if (!hasRequiredRights) {
			return reject(new APIError('Resource access denied', httpStatus.FORBIDDEN));
		}
	}

	return resolve();
};

const authenticate = (...requiredRights) => (req, res, next) => {
	// Extract teamId from params or query
	const teamId = req.params.teamId || req.query.teamId;
	
	return new Promise((resolve, reject) => {
		passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights, teamId))(req, res, next);
	})
		.then(() => next())
		.catch((err) => next(err));
};

// Middleware to check if user is a member of a specific team
const requireTeamMembership = (teamIdParam = 'teamId') => (req, res, next) => {
	const teamId = req.params[teamIdParam];
	
	if (!teamId) {
		return next(new APIError('Team ID is required', httpStatus.BAD_REQUEST));
	}

	User.isUserInTeam(req.user.id, teamId)
		.then((isMember) => {
			if (!isMember) {
				return next(new APIError('You are not a member of this team', httpStatus.FORBIDDEN));
			}
			next();
		})
		.catch((err) => next(err));
};

// Middleware to check if user has a specific role in a team
const requireTeamRole = (requiredRoles, teamIdParam = 'teamId') => (req, res, next) => {
	const teamId = req.params[teamIdParam];
	
	if (!teamId) {
		return next(new APIError('Team ID is required', httpStatus.BAD_REQUEST));
	}

	User.getUserTeamRole(req.user.id, teamId)
		.then((userRole) => {
			if (!userRole || !requiredRoles.includes(userRole)) {
				return next(new APIError('Insufficient team role permissions', httpStatus.FORBIDDEN));
			}
			next();
		})
		.catch((err) => next(err));
};

// Middleware to check team-specific resource permissions
const requireTeamPermission = (resource, action, teamIdParam = 'teamId') => (req, res, next) => {
	const teamId = req.params[teamIdParam];
	
	if (!teamId) {
		return next(new APIError('Team ID is required', httpStatus.BAD_REQUEST));
	}

	Team.canUserAccessResource(teamId, req.user.id, resource, action)
		.then((hasPermission) => {
			if (!hasPermission) {
				return next(new APIError(`Permission denied: ${resource}:${action}`, httpStatus.FORBIDDEN));
			}
			next();
		})
		.catch((err) => next(err));
};

// Middleware to check resource ownership (own vs team vs all)
const requireResourceAccess = (resourceType, teamIdParam = 'teamId') => (req, res, next) => {
	const teamId = req.params[teamIdParam];
	const resourceId = req.params.id || req.params[`${resourceType}Id`];
	
	if (!teamId || !resourceId) {
		return next(new APIError('Team ID and Resource ID are required', httpStatus.BAD_REQUEST));
	}

	// Check if user has team permissions for this resource
	Team.canUserAccessResource(teamId, req.user.id, resourceType, 'read')
		.then((hasTeamPermission) => {
			if (hasTeamPermission) {
				return next();
			}

			// If no team permission, check if user owns the resource
			// This would need to be implemented based on your resource models
			// For now, we'll just check team permissions
			return next(new APIError('Access denied to this resource', httpStatus.FORBIDDEN));
		})
		.catch((err) => next(err));
};

// Middleware to check if user can manage team members
const requireTeamManagement = (teamIdParam = 'teamId') => (req, res, next) => {
	const teamId = req.params[teamIdParam];
	
	if (!teamId) {
		return next(new APIError('Team ID is required', httpStatus.BAD_REQUEST));
	}

	User.getUserTeamRole(req.user.id, teamId)
		.then((userRole) => {
			// Only team leads and senior members can manage team members
			if (!userRole || !['team_lead', 'senior_member'].includes(userRole)) {
				return next(new APIError('Insufficient permissions to manage team members', httpStatus.FORBIDDEN));
			}
			next();
		})
		.catch((err) => next(err));
};

export {
	authenticate,
	requireTeamMembership,
	requireTeamRole,
	requireTeamPermission,
	requireResourceAccess,
	requireTeamManagement
};
