import { Router } from 'express';
import estimateController from '~/controllers/estimateController';
import authenticate from '~/middlewares/authenticate';
import validate from '~/middlewares/validate';
import estimateValidation from '~/validations/estimateValidation';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Estimate CRUD operations
router.post('/', validate(estimateValidation.createEstimate), estimateController.createEstimate);
router.get('/', estimateController.getEstimates);
router.get('/stats', estimateController.getEstimateStats);
router.get('/search', estimateController.searchEstimates);
router.get('/:estimateId', estimateController.getEstimate);
router.put('/:estimateId', validate(estimateValidation.updateEstimate), estimateController.updateEstimate);
router.delete('/:estimateId', estimateController.deleteEstimate);

// Estimate status and actions
router.patch('/:estimateId/status', validate(estimateValidation.updateEstimateStatus), estimateController.updateEstimateStatus);
router.post('/:estimateId/notes', validate(estimateValidation.addNote), estimateController.addNote);

// AI-powered estimate generation
router.post('/generate-ai', validate(estimateValidation.generateAIEstimate), estimateController.generateAIEstimate);
router.post('/create-from-ai', validate(estimateValidation.createEstimateFromAI), estimateController.createEstimateFromAI);

// Estimate revisions and duplication
router.post('/:estimateId/revision', validate(estimateValidation.createRevision), estimateController.createRevision);
router.post('/:estimateId/duplicate', estimateController.duplicateEstimate);

// Estimate PDF and sending
router.post('/:estimateId/generate-pdf', estimateController.generatePDF);
router.post('/:estimateId/send', validate(estimateValidation.sendEstimate), estimateController.sendEstimate);

export default router;
