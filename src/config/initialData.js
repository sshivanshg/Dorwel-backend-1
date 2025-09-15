import Permission from '~/models/permissionModel';
import Role from '~/models/roleModel';
import User from '~/models/userModel';
import logger from './logger';

async function initialData() {
	try {
		const countPermissions = await Permission.estimatedDocumentCount();
		if (countPermissions === 0) {
			await Permission.create(
				// User management permissions
				{
					controller: 'user',
					action: 'create'
				},
				{
					controller: 'user',
					action: 'read'
				},
				{
					controller: 'user',
					action: 'update'
				},
				{
					controller: 'user',
					action: 'delete'
				},
				// Role management permissions
				{
					controller: 'role',
					action: 'create'
				},
				{
					controller: 'role',
					action: 'read'
				},
				{
					controller: 'role',
					action: 'update'
				},
				{
					controller: 'role',
					action: 'delete'
				},
				// Project management permissions
				{
					controller: 'project',
					action: 'create'
				},
				{
					controller: 'project',
					action: 'read'
				},
				{
					controller: 'project',
					action: 'update'
				},
				{
					controller: 'project',
					action: 'delete'
				},
				// Client management permissions
				{
					controller: 'client',
					action: 'create'
				},
				{
					controller: 'client',
					action: 'read'
				},
				{
					controller: 'client',
					action: 'update'
				},
				{
					controller: 'client',
					action: 'delete'
				},
				// Design permissions
				{
					controller: 'design',
					action: 'create'
				},
				{
					controller: 'design',
					action: 'read'
				},
				{
					controller: 'design',
					action: 'update'
				},
				{
					controller: 'design',
					action: 'delete'
				},
				// Financial permissions
				{
					controller: 'financial',
					action: 'create'
				},
				{
					controller: 'financial',
					action: 'read'
				},
				{
					controller: 'financial',
					action: 'update'
				},
				{
					controller: 'financial',
					action: 'delete'
				},
				// Team management permissions
				{
					controller: 'team',
					action: 'create'
				},
				{
					controller: 'team',
					action: 'read'
				},
				{
					controller: 'team',
					action: 'update'
				},
				{
					controller: 'team',
					action: 'delete'
				},
				// Lead management permissions
				{
					controller: 'lead',
					action: 'create'
				},
				{
					controller: 'lead',
					action: 'read'
				},
				{
					controller: 'lead',
					action: 'update'
				},
				{
					controller: 'lead',
					action: 'delete'
				},
				// Estimate management permissions
				{
					controller: 'estimate',
					action: 'create'
				},
				{
					controller: 'estimate',
					action: 'read'
				},
				{
					controller: 'estimate',
					action: 'update'
				},
				{
					controller: 'estimate',
					action: 'delete'
				},
				// Moodboard management permissions
				{
					controller: 'moodboard',
					action: 'create'
				},
				{
					controller: 'moodboard',
					action: 'read'
				},
				{
					controller: 'moodboard',
					action: 'update'
				},
				{
					controller: 'moodboard',
					action: 'delete'
				}
			);
		}
		const countRoles = await Role.estimatedDocumentCount();
		if (countRoles === 0) {
			const allPermissions = await Permission.find();
			const projectPermissions = await Permission.find({ 
				$or: [
					{ controller: 'project' },
					{ controller: 'client' },
					{ controller: 'design' },
					{ controller: 'lead' },
					{ controller: 'estimate' },
					{ controller: 'moodboard' },
					{ controller: 'team' }
				]
			});
			const clientPermissions = await Permission.find({ 
				$or: [
					{ controller: 'project' },
					{ controller: 'client' },
					{ controller: 'design' },
					{ controller: 'lead' },
					{ controller: 'estimate' },
					{ controller: 'moodboard' }
				],
				action: { $ne: 'delete' }
			});
			const basicPermissions = await Permission.find({ 
				$or: [
					{ controller: 'project', action: 'read' },
					{ controller: 'client', action: 'read' },
					{ controller: 'design', action: 'read' },
					{ controller: 'lead', action: 'read' },
					{ controller: 'estimate', action: 'read' },
					{ controller: 'moodboard', action: 'read' }
				]
			});
			const teamManagementPermissions = await Permission.find({ 
				$or: [
					{ controller: 'team' },
					{ controller: 'user' }
				]
			});
			
			await Role.create(
				{
					name: 'Studio Owner',
					description: 'Full access to all features including financial management, user administration, and team management',
					permissions: allPermissions
				},
				{
					name: 'Team Manager',
					description: 'Can manage teams, projects, clients, and designs. Full access to team operations',
					permissions: [...projectPermissions, ...teamManagementPermissions]
				},
				{
					name: 'Senior Designer',
					description: 'Can manage projects, clients, and designs. Full access to design operations',
					permissions: projectPermissions
				},
				{
					name: 'Designer',
					description: 'Can view and update projects, clients, and designs. Cannot delete records',
					permissions: clientPermissions
				},
				{
					name: 'Project Coordinator',
					description: 'Can view projects and clients. Limited design access for coordination purposes',
					permissions: basicPermissions
				},
				{
					name: 'Client',
					description: 'Limited access to view their own projects and designs',
					permissions: []
				}
			);
		}

		// Ensure critical roles always exist (idempotent)
		// Studio Owner → all permissions; Designer → limited client/project/design/read-update set
		try {
			const [designerRole, studioOwnerRole] = await Promise.all([
				Role.findOne({ name: 'Designer' }),
				Role.findOne({ name: 'Studio Owner' })
			]);

			if (!studioOwnerRole) {
				const allPermissions = await Permission.find();
				await Role.create({
					name: 'Studio Owner',
					description: 'Full access to all features including financial management, user administration, and team management',
					permissions: allPermissions
				});
				logger.info('Seeded missing role: Studio Owner');
			}

			if (!designerRole) {
				const clientPermissions = await Permission.find({
					$or: [
						{ controller: 'project' },
						{ controller: 'client' },
						{ controller: 'design' },
						{ controller: 'lead' },
						{ controller: 'estimate' },
						{ controller: 'moodboard' }
					],
					action: { $ne: 'delete' }
				});
				await Role.create({
					name: 'Designer',
					description: 'Can view and update projects, clients, and designs. Cannot delete records',
					permissions: clientPermissions
				});
				logger.info('Seeded missing role: Designer');
			}
		} catch (e) {
			logger.error(e);
		}
		const countUsers = await User.estimatedDocumentCount();
		if (countUsers === 0) {
			const roleStudioOwner = await Role.findOne({ name: 'Studio Owner' });
			const roleSeniorDesigner = await Role.findOne({ name: 'Senior Designer' });
			const roleDesigner = await Role.findOne({ name: 'Designer' });
			const roleProjectCoordinator = await Role.findOne({ name: 'Project Coordinator' });
			const roleClient = await Role.findOne({ name: 'Client' });
			
			await User.create(
				{
					firstName: 'Alex',
					lastName: 'Chen',
					userName: 'studioowner',
					email: 'alex.chen@dorwel.com',
					password: 'studioowner123',
					roles: [roleStudioOwner]
				},
				{
					firstName: 'Sarah',
					lastName: 'Martinez',
					userName: 'seniordesigner',
					email: 'sarah.martinez@dorwel.com',
					password: 'seniordesigner123',
					roles: [roleSeniorDesigner]
				},
				{
					firstName: 'Michael',
					lastName: 'Johnson',
					userName: 'designer',
					email: 'michael.johnson@dorwel.com',
					password: 'designer123',
					roles: [roleDesigner]
				},
				{
					firstName: 'Emily',
					lastName: 'Davis',
					userName: 'coordinator',
					email: 'emily.davis@dorwel.com',
					password: 'coordinator123',
					roles: [roleProjectCoordinator]
				},
				{
					firstName: 'David',
					lastName: 'Wilson',
					userName: 'client',
					email: 'david.wilson@example.com',
					password: 'client123',
					roles: [roleClient]
				}
			);
		}
	} catch (err) {
		logger.error(err);
	}
}

export default initialData;
