import { Router } from 'express';
import leadController from '~/controllers/leadController';
import authenticate from '~/middlewares/authenticate';
import validate from '~/middlewares/validate';
import leadValidation from '~/validations/leadValidation';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Lead CRUD operations
router.post('/', validate(leadValidation.createLead), leadController.createLead);
router.get('/', leadController.getLeads);
router.get('/stats', leadController.getLeadStats);
router.get('/search', leadController.searchLeads);
router.get('/:leadId', leadController.getLead);
router.put('/:leadId', validate(leadValidation.updateLead), leadController.updateLead);
router.delete('/:leadId', leadController.deleteLead);

// Lead status and notes
router.patch('/:leadId/status', validate(leadValidation.updateLeadStatus), leadController.updateLeadStatus);
router.post('/:leadId/notes', validate(leadValidation.addNote), leadController.addNote);

// Lead conversion
router.post('/:leadId/convert-to-client', leadController.convertToClient);
router.post('/:leadId/convert-to-project', validate(leadValidation.convertToProject), leadController.convertToProject);

// Lead follow-up and communication
router.post('/:leadId/follow-up', validate(leadValidation.sendFollowUp), leadController.sendFollowUp);

// AI-powered features
router.post('/:leadId/generate-ai-estimate', leadController.generateAIEstimate);

export default router;
