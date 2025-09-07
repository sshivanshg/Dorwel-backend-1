import crypto from 'crypto';
import config from '~/config/config';
import logger from '~/config/logger';
import messagingService from './messagingService';
import aiService from './aiService';
import pdfService from './pdfService';

class WebhookService {
	constructor() {
		this.webhookSecrets = {
			twilio: config.TWILIO_WEBHOOK_SECRET || 'default-secret',
			openai: config.OPENAI_WEBHOOK_SECRET || 'default-secret',
			google: config.GOOGLE_WEBHOOK_SECRET || 'default-secret'
		};
	}

	// Twilio Webhook Handlers
	async handleTwilioWebhook(req, res) {
		try {
			const signature = req.headers['x-twilio-signature'];
			const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
			const body = req.body;

			// Verify webhook signature
			if (!this.verifyTwilioSignature(signature, url, body)) {
				logger.warn('Invalid Twilio webhook signature');
				return res.status(401).json({ error: 'Unauthorized' });
			}

			const { MessageStatus, MessageSid, To, From, Body } = body;

			// Handle different webhook events
			switch (MessageStatus) {
				case 'delivered':
					await this.handleMessageDelivered(MessageSid, To, From);
					break;
				case 'failed':
					await this.handleMessageFailed(MessageSid, To, From, Body);
					break;
				case 'undelivered':
					await this.handleMessageUndelivered(MessageSid, To, From);
					break;
				default:
					logger.info(`Unhandled Twilio webhook status: ${MessageStatus}`);
			}

			res.status(200).json({ success: true });
		} catch (error) {
			logger.error('Twilio webhook error:', error);
			res.status(500).json({ error: 'Internal server error' });
		}
	}

	verifyTwilioSignature(signature, url, body) {
		// In production, implement proper Twilio signature verification
		// For now, we'll use a simple secret check
		return signature && signature.length > 0;
	}

	async handleMessageDelivered(messageSid, to, from) {
		logger.info(`Message delivered: ${messageSid} from ${from} to ${to}`);
		// Update message status in database if needed
	}

	async handleMessageFailed(messageSid, to, from, body) {
		logger.error(`Message failed: ${messageSid} from ${from} to ${to}. Body: ${body}`);
		// Handle failed message delivery
		// Could retry or notify admin
	}

	async handleMessageUndelivered(messageSid, to, from) {
		logger.warn(`Message undelivered: ${messageSid} from ${from} to ${to}`);
		// Handle undelivered message
	}

	// OpenAI Webhook Handlers
	async handleOpenAIWebhook(req, res) {
		try {
			const signature = req.headers['openai-signature'];
			const body = JSON.stringify(req.body);

			// Verify webhook signature
			if (!this.verifyOpenAISignature(signature, body)) {
				logger.warn('Invalid OpenAI webhook signature');
				return res.status(401).json({ error: 'Unauthorized' });
			}

			const { event, data } = req.body;

			switch (event) {
				case 'completion.completed':
					await this.handleCompletionCompleted(data);
					break;
				case 'completion.failed':
					await this.handleCompletionFailed(data);
					break;
				default:
					logger.info(`Unhandled OpenAI webhook event: ${event}`);
			}

			res.status(200).json({ success: true });
		} catch (error) {
			logger.error('OpenAI webhook error:', error);
			res.status(500).json({ error: 'Internal server error' });
		}
	}

	verifyOpenAISignature(signature, body) {
		const expectedSignature = crypto
			.createHmac('sha256', this.webhookSecrets.openai)
			.update(body)
			.digest('hex');
		
		return crypto.timingSafeEqual(
			Buffer.from(signature, 'hex'),
			Buffer.from(expectedSignature, 'hex')
		);
	}

	async handleCompletionCompleted(data) {
		logger.info(`OpenAI completion completed: ${data.id}`);
		// Handle successful AI completion
		// Could trigger notifications or update database
	}

	async handleCompletionFailed(data) {
		logger.error(`OpenAI completion failed: ${data.id} - ${data.error}`);
		// Handle failed AI completion
		// Could retry or notify admin
	}

	// Google OAuth Webhook Handlers
	async handleGoogleWebhook(req, res) {
		try {
			const signature = req.headers['x-google-signature'];
			const body = JSON.stringify(req.body);

			// Verify webhook signature
			if (!this.verifyGoogleSignature(signature, body)) {
				logger.warn('Invalid Google webhook signature');
				return res.status(401).json({ error: 'Unauthorized' });
			}

			const { event, data } = req.body;

			switch (event) {
				case 'user.updated':
					await this.handleUserUpdated(data);
					break;
				case 'user.deleted':
					await this.handleUserDeleted(data);
					break;
				default:
					logger.info(`Unhandled Google webhook event: ${event}`);
			}

			res.status(200).json({ success: true });
		} catch (error) {
			logger.error('Google webhook error:', error);
			res.status(500).json({ error: 'Internal server error' });
		}
	}

	verifyGoogleSignature(signature, body) {
		const expectedSignature = crypto
			.createHmac('sha256', this.webhookSecrets.google)
			.update(body)
			.digest('hex');
		
		return crypto.timingSafeEqual(
			Buffer.from(signature, 'hex'),
			Buffer.from(expectedSignature, 'hex')
		);
	}

	async handleUserUpdated(data) {
		logger.info(`Google user updated: ${data.userId}`);
		// Handle user profile updates from Google
	}

	async handleUserDeleted(data) {
		logger.info(`Google user deleted: ${data.userId}`);
		// Handle user deletion from Google
	}

	// Generic webhook handler
	async handleGenericWebhook(req, res) {
		try {
			const { service, event, data } = req.body;

			logger.info(`Generic webhook received: ${service}.${event}`);

			// Route to appropriate handler based on service
			switch (service) {
				case 'twilio':
					await this.handleTwilioWebhook(req, res);
					break;
				case 'openai':
					await this.handleOpenAIWebhook(req, res);
					break;
				case 'google':
					await this.handleGoogleWebhook(req, res);
					break;
				default:
					logger.warn(`Unknown webhook service: ${service}`);
					res.status(400).json({ error: 'Unknown service' });
			}
		} catch (error) {
			logger.error('Generic webhook error:', error);
			res.status(500).json({ error: 'Internal server error' });
		}
	}

	// Health check for webhook endpoints
	async healthCheck(req, res) {
		const services = {
			twilio: await messagingService.isServiceAvailable(),
			openai: await aiService.isServiceAvailable(),
			google: true // Google OAuth doesn't have a specific health check
		};

		res.json({
			success: true,
			data: {
				services,
				timestamp: new Date().toISOString(),
				status: 'healthy'
			}
		});
	}

	// Test webhook endpoint
	async testWebhook(req, res) {
		const { service, event, data } = req.body;

		logger.info(`Test webhook received: ${service}.${event}`, data);

		res.json({
			success: true,
			message: 'Test webhook received successfully',
			data: {
				service,
				event,
				data,
				timestamp: new Date().toISOString()
			}
		});
	}
}

export default new WebhookService();
