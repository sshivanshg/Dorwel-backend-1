import { Router } from 'express';
import projectController from '~/controllers/projectController';
import authenticate from '~/middlewares/authenticate';
import validate from '~/middlewares/validate';
import projectValidation from '~/validations/projectValidation';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Project CRUD operations
router.post('/', validate(projectValidation.createProject), projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/stats', projectController.getProjectStats);
router.get('/search', projectController.searchProjects);
router.get('/:projectId', projectController.getProject);
router.put('/:projectId', validate(projectValidation.updateProject), projectController.updateProject);
router.delete('/:projectId', projectController.deleteProject);

// Project status and progress
router.patch('/:projectId/status', validate(projectValidation.updateProjectStatus), projectController.updateProjectStatus);
router.patch('/:projectId/progress', validate(projectValidation.updateProgress), projectController.updateProgress);

// Project milestones
router.post('/:projectId/milestones', validate(projectValidation.addMilestone), projectController.addMilestone);
router.patch('/:projectId/milestones/:milestoneId', validate(projectValidation.updateMilestone), projectController.updateMilestone);

// Project notes and documents
router.post('/:projectId/notes', validate(projectValidation.addNote), projectController.addNote);
router.post('/:projectId/documents', validate(projectValidation.addDocument), projectController.addDocument);

// Project reports
router.post('/:projectId/generate-report', projectController.generateProjectReport);

// Project queries by relationship
router.get('/client/:clientId', projectController.getClientProjects);
router.get('/team-member/:userId', projectController.getTeamMemberProjects);

export default router;
