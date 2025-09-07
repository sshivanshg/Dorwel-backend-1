import { Router } from 'express';
import clientController from '~/controllers/clientController';
import authenticate from '~/middlewares/authenticate';
import validate from '~/middlewares/validate';
import clientValidation from '~/validations/clientValidation';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Client CRUD operations
router.post('/', validate(clientValidation.createClient), clientController.createClient);
router.get('/', clientController.getClients);
router.get('/stats', clientController.getClientStats);
router.get('/search', clientController.searchClients);
router.get('/:clientId', clientController.getClient);
router.put('/:clientId', validate(clientValidation.updateClient), clientController.updateClient);
router.delete('/:clientId', clientController.deleteClient);

// Client status and notes
router.patch('/:clientId/status', validate(clientValidation.updateClientStatus), clientController.updateClientStatus);
router.post('/:clientId/notes', validate(clientValidation.addNote), clientController.addNote);

// Client portal access
router.patch('/:clientId/portal-access', validate(clientValidation.updatePortalAccess), clientController.updatePortalAccess);

// Client projects
router.get('/:clientId/projects', clientController.getClientProjects);
router.get('/:clientId/timeline', clientController.getClientTimeline);

// Client communication
router.post('/:clientId/send-message', validate(clientValidation.sendMessage), clientController.sendMessage);
router.post('/:clientId/schedule-appointment', validate(clientValidation.scheduleAppointment), clientController.scheduleAppointment);

// Client preferences and custom fields
router.patch('/:clientId/preferences', validate(clientValidation.updatePreferences), clientController.updateClientPreferences);
router.post('/:clientId/custom-fields', validate(clientValidation.addCustomField), clientController.addCustomField);
router.delete('/:clientId/custom-fields', validate(clientValidation.removeCustomField), clientController.removeCustomField);

export default router;
