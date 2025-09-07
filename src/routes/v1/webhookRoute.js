import { Router } from 'express';
import webhookService from '~/services/webhookService';
import catchAsync from '~/utils/catchAsync';

const router = Router();

// Twilio webhooks
router.post('/twilio', catchAsync(webhookService.handleTwilioWebhook.bind(webhookService)));

// OpenAI webhooks
router.post('/openai', catchAsync(webhookService.handleOpenAIWebhook.bind(webhookService)));

// Google OAuth webhooks
router.post('/google', catchAsync(webhookService.handleGoogleWebhook.bind(webhookService)));

// Generic webhook handler
router.post('/generic', catchAsync(webhookService.handleGenericWebhook.bind(webhookService)));

// Health check for webhook services
router.get('/health', catchAsync(webhookService.healthCheck.bind(webhookService)));

// Test webhook endpoint
router.post('/test', catchAsync(webhookService.testWebhook.bind(webhookService)));

export default router;
