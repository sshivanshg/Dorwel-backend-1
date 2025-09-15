import { Router } from 'express';
import teamController from '~/controllers/teamController';
import authenticate from '~/middlewares/authenticate';
import validate from '~/middlewares/validate';
import teamValidation from '~/validations/teamValidation';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Team CRUD operations
router.post('/', validate(teamValidation.createTeam), teamController.createTeam);
router.get('/', teamController.getTeams);
router.get('/stats', teamController.getTeamStats);
router.get('/search', teamController.searchTeams);
router.get('/my-teams', teamController.getTeamsByUser);
router.get('/type/:teamType', teamController.getTeamsByType);
router.get('/:teamId', teamController.getTeam);
router.put('/:teamId', validate(teamValidation.updateTeam), teamController.updateTeam);
router.delete('/:teamId', teamController.deleteTeam);

// Team member management
router.post('/:teamId/members', validate(teamValidation.addMember), teamController.addMember);
router.delete('/:teamId/members', validate(teamValidation.removeMember), teamController.removeMember);
router.put('/:teamId/members/role', validate(teamValidation.updateMemberRole), teamController.updateMemberRole);
router.get('/:teamId/members', teamController.getTeamMembers);

// User team management
router.get('/user/:userId/teams', teamController.getUserTeams);

// Permission checking
router.get('/:teamId/permissions/check', teamController.checkUserPermission);

export default router;
