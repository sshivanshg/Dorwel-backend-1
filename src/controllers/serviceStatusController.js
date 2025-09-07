import httpStatus from 'http-status';
import catchAsync from '~/utils/catchAsync';
import aiService from '~/services/aiService';
import messagingService from '~/services/messagingService';
import emailService from '~/services/emailService';
import googleOAuthService from '~/services/googleOAuthService';
import realtimeService from '~/services/realtimeService';

const getServiceStatus = catchAsync(async (req, res) => {
	const services = {
		ai: {
			name: 'OpenAI',
			status: 'checking',
			available: false,
			lastChecked: new Date(),
			responseTime: null,
			error: null
		},
		messaging: {
			name: 'Twilio',
			status: 'checking',
			available: false,
			lastChecked: new Date(),
			responseTime: null,
			error: null
		},
		email: {
			name: 'Email Service',
			status: 'checking',
			available: false,
			lastChecked: new Date(),
			responseTime: null,
			error: null
		},
		google: {
			name: 'Google OAuth',
			status: 'checking',
			available: false,
			lastChecked: new Date(),
			responseTime: null,
			error: null
		},
		realtime: {
			name: 'Real-time Service',
			status: 'checking',
			available: false,
			lastChecked: new Date(),
			responseTime: null,
			error: null,
			connectedUsers: 0
		}
	};

	// Check AI service
	try {
		const startTime = Date.now();
		services.ai.available = await aiService.isServiceAvailable();
		services.ai.responseTime = Date.now() - startTime;
		services.ai.status = services.ai.available ? 'healthy' : 'unhealthy';
	} catch (error) {
		services.ai.status = 'error';
		services.ai.error = error.message;
	}

	// Check messaging service
	try {
		const startTime = Date.now();
		services.messaging.available = await messagingService.isServiceAvailable();
		services.messaging.responseTime = Date.now() - startTime;
		services.messaging.status = services.messaging.available ? 'healthy' : 'unhealthy';
	} catch (error) {
		services.messaging.status = 'error';
		services.messaging.error = error.message;
	}

	// Check email service
	try {
		const startTime = Date.now();
		services.email.available = await emailService.isServiceAvailable();
		services.email.responseTime = Date.now() - startTime;
		services.email.status = services.email.available ? 'healthy' : 'unhealthy';
	} catch (error) {
		services.email.status = 'error';
		services.email.error = error.message;
	}

	// Check Google OAuth service
	try {
		const startTime = Date.now();
		services.google.available = await googleOAuthService.isServiceAvailable();
		services.google.responseTime = Date.now() - startTime;
		services.google.status = services.google.available ? 'healthy' : 'unhealthy';
	} catch (error) {
		services.google.status = 'error';
		services.google.error = error.message;
	}

	// Check real-time service
	try {
		services.realtime.available = realtimeService.io !== null;
		services.realtime.status = services.realtime.available ? 'healthy' : 'unhealthy';
		services.realtime.connectedUsers = realtimeService.getConnectedUsersCount();
	} catch (error) {
		services.realtime.status = 'error';
		services.realtime.error = error.message;
	}

	// Calculate overall system health
	const healthyServices = Object.values(services).filter(service => service.status === 'healthy').length;
	const totalServices = Object.keys(services).length;
	const overallHealth = (healthyServices / totalServices) * 100;

	res.json({
		success: true,
		data: {
			overall: {
				status: overallHealth >= 80 ? 'healthy' : overallHealth >= 50 ? 'degraded' : 'unhealthy',
				healthPercentage: Math.round(overallHealth),
				healthyServices,
				totalServices,
				lastChecked: new Date()
			},
			services
		}
	});
});

const getServiceHealth = catchAsync(async (req, res) => {
	const { service } = req.params;
	
	let serviceData = null;

	switch (service) {
		case 'ai':
			try {
				const available = await aiService.isServiceAvailable();
				serviceData = {
					name: 'OpenAI',
					available,
					status: available ? 'healthy' : 'unhealthy',
					lastChecked: new Date()
				};
			} catch (error) {
				serviceData = {
					name: 'OpenAI',
					available: false,
					status: 'error',
					error: error.message,
					lastChecked: new Date()
				};
			}
			break;

		case 'messaging':
			try {
				const available = await messagingService.isServiceAvailable();
				serviceData = {
					name: 'Twilio',
					available,
					status: available ? 'healthy' : 'unhealthy',
					lastChecked: new Date()
				};
			} catch (error) {
				serviceData = {
					name: 'Twilio',
					available: false,
					status: 'error',
					error: error.message,
					lastChecked: new Date()
				};
			}
			break;

		case 'email':
			try {
				const available = await emailService.isServiceAvailable();
				serviceData = {
					name: 'Email Service',
					available,
					status: available ? 'healthy' : 'unhealthy',
					lastChecked: new Date()
				};
			} catch (error) {
				serviceData = {
					name: 'Email Service',
					available: false,
					status: 'error',
					error: error.message,
					lastChecked: new Date()
				};
			}
			break;

		case 'google':
			try {
				const available = await googleOAuthService.isServiceAvailable();
				serviceData = {
					name: 'Google OAuth',
					available,
					status: available ? 'healthy' : 'unhealthy',
					lastChecked: new Date()
				};
			} catch (error) {
				serviceData = {
					name: 'Google OAuth',
					available: false,
					status: 'error',
					error: error.message,
					lastChecked: new Date()
				};
			}
			break;

		case 'realtime':
			try {
				const available = realtimeService.io !== null;
				serviceData = {
					name: 'Real-time Service',
					available,
					status: available ? 'healthy' : 'unhealthy',
					connectedUsers: realtimeService.getConnectedUsersCount(),
					lastChecked: new Date()
				};
			} catch (error) {
				serviceData = {
					name: 'Real-time Service',
					available: false,
					status: 'error',
					error: error.message,
					lastChecked: new Date()
				};
			}
			break;

		default:
			return res.status(httpStatus.NOT_FOUND).json({
				success: false,
				message: 'Service not found'
			});
	}

	res.json({
		success: true,
		data: serviceData
	});
});

const getConnectedUsers = catchAsync(async (req, res) => {
	const users = realtimeService.getConnectedUsers();
	
	res.json({
		success: true,
		data: {
			users,
			count: users.length,
			lastUpdated: new Date()
		}
	});
});

const getSystemMetrics = catchAsync(async (req, res) => {
	const metrics = {
		uptime: process.uptime(),
		memory: process.memoryUsage(),
		cpu: process.cpuUsage(),
		connectedUsers: realtimeService.getConnectedUsersCount(),
		timestamp: new Date()
	};

	res.json({
		success: true,
		data: metrics
	});
});

const testService = catchAsync(async (req, res) => {
	const { service } = req.params;
	const { action } = req.body;

	let result = null;

	switch (service) {
		case 'ai':
			if (action === 'generate-test') {
				try {
					result = await aiService.generateEstimateItems(
						'Test project for AI service',
						'residential',
						'medium',
						50000
					);
				} catch (error) {
					result = { error: error.message };
				}
			}
			break;

		case 'messaging':
			if (action === 'send-test') {
				const { phoneNumber } = req.body;
				try {
					result = await messagingService.sendSMS(
						phoneNumber,
						'Test message from DesignFlow Studio'
					);
				} catch (error) {
					result = { error: error.message };
				}
			}
			break;

		case 'email':
			if (action === 'send-test') {
				const { email } = req.body;
				try {
					result = await emailService.sendEmail({
						to: email,
						subject: 'Test Email from DesignFlow Studio',
						html: '<h1>Test Email</h1><p>This is a test email from DesignFlow Studio.</p>',
						text: 'Test Email\n\nThis is a test email from DesignFlow Studio.'
					});
				} catch (error) {
					result = { error: error.message };
				}
			}
			break;

		default:
			return res.status(httpStatus.NOT_FOUND).json({
				success: false,
				message: 'Service not found'
			});
	}

	res.json({
		success: true,
		data: {
			service,
			action,
			result,
			timestamp: new Date()
		}
	});
});

export default {
	getServiceStatus,
	getServiceHealth,
	getConnectedUsers,
	getSystemMetrics,
	testService
};
