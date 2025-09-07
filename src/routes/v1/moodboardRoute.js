import { Router } from 'express';
import moodboardController from '~/controllers/moodboardController';
import authenticate from '~/middlewares/authenticate';
import validate from '~/middlewares/validate';
import moodboardValidation from '~/validations/moodboardValidation';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Moodboard CRUD operations
router.post('/', validate(moodboardValidation.createMoodboard), moodboardController.createMoodboard);
router.get('/', moodboardController.getMoodboards);
router.get('/stats', moodboardController.getMoodboardStats);
router.get('/search', moodboardController.searchMoodboards);
router.get('/:moodboardId', moodboardController.getMoodboard);
router.put('/:moodboardId', validate(moodboardValidation.updateMoodboard), moodboardController.updateMoodboard);
router.delete('/:moodboardId', moodboardController.deleteMoodboard);

// Moodboard status and sharing
router.patch('/:moodboardId/status', validate(moodboardValidation.updateMoodboardStatus), moodboardController.updateMoodboardStatus);
router.post('/:moodboardId/share-token', validate(moodboardValidation.generateShareToken), moodboardController.generateShareToken);
router.get('/shared/:token', moodboardController.getMoodboardByToken);

// Moodboard items
router.post('/:moodboardId/items', validate(moodboardValidation.addItem), moodboardController.addItem);
router.patch('/:moodboardId/items/:itemId', validate(moodboardValidation.updateItem), moodboardController.updateItem);
router.delete('/:moodboardId/items/:itemId', moodboardController.removeItem);

// Moodboard comments and collaboration
router.post('/:moodboardId/comments', validate(moodboardValidation.addComment), moodboardController.addComment);
router.post('/:moodboardId/comments/:commentId/replies', validate(moodboardValidation.addReply), moodboardController.addReply);

// AI-powered moodboard features
router.post('/generate-ai-suggestions', validate(moodboardValidation.generateAISuggestions), moodboardController.generateAISuggestions);
router.post('/create-from-ai', validate(moodboardValidation.createMoodboardFromAI), moodboardController.createMoodboardFromAI);

// Moodboard duplication
router.post('/:moodboardId/duplicate', moodboardController.duplicateMoodboard);

// Moodboard queries by relationship
router.get('/project/:projectId', moodboardController.getProjectMoodboards);
router.get('/client/:clientId', moodboardController.getClientMoodboards);

export default router;
