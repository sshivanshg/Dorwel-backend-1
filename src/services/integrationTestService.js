import aiService from './aiService';
import messagingService from './messagingService';
import emailService from './emailService';
import googleOAuthService from './googleOAuthService';
import realtimeService from './realtimeService';
import pdfService from './pdfService';
import logger from '~/config/logger';

class IntegrationTestService {
	constructor() {
		this.testResults = {
			ai: null,
			messaging: null,
			email: null,
			google: null,
			realtime: null,
			pdf: null
		};
	}

	async runAllTests() {
		logger.info('Starting integration tests for all external services...');

		const tests = [
			this.testAIService(),
			this.testMessagingService(),
			this.testEmailService(),
			this.testGoogleOAuthService(),
			this.testRealtimeService(),
			this.testPDFService()
		];

		const results = await Promise.allSettled(tests);
		
		const summary = {
			total: results.length,
			passed: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
			failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length,
			results: this.testResults,
			timestamp: new Date()
		};

		logger.info('Integration tests completed:', summary);
		return summary;
	}

	async testAIService() {
		try {
			logger.info('Testing AI service...');
			
			// Test service availability
			const isAvailable = await aiService.isServiceAvailable();
			if (!isAvailable) {
				this.testResults.ai = {
					success: false,
					error: 'AI service not available',
					timestamp: new Date()
				};
				return this.testResults.ai;
			}

			// Test estimate generation
			const testEstimate = await aiService.generateEstimateItems(
				'Test residential living room design with modern furniture',
				'residential',
				'medium',
				75000
			);

			if (!testEstimate || !testEstimate.items || testEstimate.items.length === 0) {
				throw new Error('AI estimate generation failed');
			}

			// Test moodboard suggestions
			const testMoodboard = await aiService.generateMoodboardSuggestions(
				'Modern minimalist living room',
				'contemporary',
				'neutral',
				50000
			);

			if (!testMoodboard || !testMoodboard.suggestions) {
				throw new Error('AI moodboard suggestions failed');
			}

			this.testResults.ai = {
				success: true,
				details: {
					estimateItems: testEstimate.items.length,
					moodboardSuggestions: testMoodboard.suggestions.length,
					confidence: testEstimate.confidence
				},
				timestamp: new Date()
			};

			logger.info('AI service test passed');
			return this.testResults.ai;
		} catch (error) {
			logger.error('AI service test failed:', error);
			this.testResults.ai = {
				success: false,
				error: error.message,
				timestamp: new Date()
			};
			return this.testResults.ai;
		}
	}

	async testMessagingService() {
		try {
			logger.info('Testing messaging service...');
			
			// Test service availability
			const isAvailable = await messagingService.isServiceAvailable();
			if (!isAvailable) {
				this.testResults.messaging = {
					success: false,
					error: 'Messaging service not available',
					timestamp: new Date()
				};
				return this.testResults.messaging;
			}

			// Test phone number validation
			const validationResult = await messagingService.validatePhoneNumber('+1234567890');
			if (!validationResult.valid) {
				throw new Error('Phone number validation failed');
			}

			this.testResults.messaging = {
				success: true,
				details: {
					serviceAvailable: true,
					phoneValidation: true
				},
				timestamp: new Date()
			};

			logger.info('Messaging service test passed');
			return this.testResults.messaging;
		} catch (error) {
			logger.error('Messaging service test failed:', error);
			this.testResults.messaging = {
				success: false,
				error: error.message,
				timestamp: new Date()
			};
			return this.testResults.messaging;
		}
	}

	async testEmailService() {
		try {
			logger.info('Testing email service...');
			
			// Test service availability
			const isAvailable = await emailService.isServiceAvailable();
			if (!isAvailable) {
				this.testResults.email = {
					success: false,
					error: 'Email service not available',
					timestamp: new Date()
				};
				return this.testResults.email;
			}

			this.testResults.email = {
				success: true,
				details: {
					serviceAvailable: true,
					smtpConfigured: true
				},
				timestamp: new Date()
			};

			logger.info('Email service test passed');
			return this.testResults.email;
		} catch (error) {
			logger.error('Email service test failed:', error);
			this.testResults.email = {
				success: false,
				error: error.message,
				timestamp: new Date()
			};
			return this.testResults.email;
		}
	}

	async testGoogleOAuthService() {
		try {
			logger.info('Testing Google OAuth service...');
			
			// Test service availability
			const isAvailable = await googleOAuthService.isServiceAvailable();
			if (!isAvailable) {
				this.testResults.google = {
					success: false,
					error: 'Google OAuth service not available',
					timestamp: new Date()
				};
				return this.testResults.google;
			}

			// Test auth URL generation
			const authUrl = googleOAuthService.getAuthURL();
			if (!authUrl || !authUrl.includes('accounts.google.com')) {
				throw new Error('Auth URL generation failed');
			}

			this.testResults.google = {
				success: true,
				details: {
					serviceAvailable: true,
					authUrlGenerated: true
				},
				timestamp: new Date()
			};

			logger.info('Google OAuth service test passed');
			return this.testResults.google;
		} catch (error) {
			logger.error('Google OAuth service test failed:', error);
			this.testResults.google = {
				success: false,
				error: error.message,
				timestamp: new Date()
			};
			return this.testResults.google;
		}
	}

	async testRealtimeService() {
		try {
			logger.info('Testing real-time service...');
			
			// Test service initialization
			const isInitialized = realtimeService.io !== null;
			if (!isInitialized) {
				this.testResults.realtime = {
					success: false,
					error: 'Real-time service not initialized',
					timestamp: new Date()
				};
				return this.testResults.realtime;
			}

			// Test connected users count
			const connectedUsers = realtimeService.getConnectedUsersCount();

			this.testResults.realtime = {
				success: true,
				details: {
					serviceInitialized: true,
					connectedUsers,
					ioServer: !!realtimeService.io
				},
				timestamp: new Date()
			};

			logger.info('Real-time service test passed');
			return this.testResults.realtime;
		} catch (error) {
			logger.error('Real-time service test failed:', error);
			this.testResults.realtime = {
				success: false,
				error: error.message,
				timestamp: new Date()
			};
			return this.testResults.realtime;
		}
	}

	async testPDFService() {
		try {
			logger.info('Testing PDF service...');
			
			// Test storage directory creation
			const testData = {
				_id: 'test-estimate-id',
				title: 'Test Estimate',
				description: 'Test estimate for integration testing',
				client: {
					firstName: 'Test',
					lastName: 'Client',
					email: 'test@example.com',
					phone: '+1234567890',
					company: 'Test Company'
				},
				items: [
					{
						category: 'design',
						name: 'Test Item',
						description: 'Test item description',
						quantity: 1,
						unit: 'each',
						unitPrice: 100,
						totalPrice: 100
					}
				],
				pricing: {
					subtotal: 100,
					taxRate: 10,
					taxAmount: 10,
					discountRate: 0,
					discountAmount: 0,
					totalAmount: 110,
					currency: 'USD'
				},
				validity: {
					validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
					daysValid: 30
				},
				terms: {
					paymentTerms: 'Net 30',
					depositRequired: 0,
					depositAmount: 0,
					additionalTerms: ''
				},
				createdAt: new Date()
			};

			// Test PDF generation
			const pdfResult = await pdfService.generateEstimatePDF(testData);
			
			if (!pdfResult || !pdfResult.filename || !pdfResult.publicUrl) {
				throw new Error('PDF generation failed');
			}

			this.testResults.pdf = {
				success: true,
				details: {
					pdfGenerated: true,
					filename: pdfResult.filename,
					size: pdfResult.size
				},
				timestamp: new Date()
			};

			logger.info('PDF service test passed');
			return this.testResults.pdf;
		} catch (error) {
			logger.error('PDF service test failed:', error);
			this.testResults.pdf = {
				success: false,
				error: error.message,
				timestamp: new Date()
			};
			return this.testResults.pdf;
		}
	}

	async testSpecificService(serviceName) {
		switch (serviceName) {
			case 'ai':
				return await this.testAIService();
			case 'messaging':
				return await this.testMessagingService();
			case 'email':
				return await this.testEmailService();
			case 'google':
				return await this.testGoogleOAuthService();
			case 'realtime':
				return await this.testRealtimeService();
			case 'pdf':
				return await this.testPDFService();
			default:
				throw new Error(`Unknown service: ${serviceName}`);
		}
	}

	getTestResults() {
		return this.testResults;
	}

	clearTestResults() {
		this.testResults = {
			ai: null,
			messaging: null,
			email: null,
			google: null,
			realtime: null,
			pdf: null
		};
	}
}

export default new IntegrationTestService();
