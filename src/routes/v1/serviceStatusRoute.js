import { Router } from 'express';
import serviceStatusController from '~/controllers/serviceStatusController';
import authenticate from '~/middlewares/authenticate';
import catchAsync from '~/utils/catchAsync';
import validate from '~/middlewares/validate';
import Joi from 'joi';
import integrationTestService from '~/services/integrationTestService';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Service status routes
router.get('/status', serviceStatusController.getServiceStatus);
router.get('/health/:service', serviceStatusController.getServiceHealth);
router.get('/connected-users', serviceStatusController.getConnectedUsers);
router.get('/metrics', serviceStatusController.getSystemMetrics);

// Test service endpoints
router.post('/test/:service', 
	validate({
		params: Joi.object().keys({
			service: Joi.string().valid('ai', 'messaging', 'email', 'google', 'realtime').required()
		}),
		body: Joi.object().keys({
			action: Joi.string().required(),
			phoneNumber: Joi.string().when('service', {
				is: 'messaging',
				then: Joi.required(),
				otherwise: Joi.optional()
			}),
			email: Joi.string().email().when('service', {
				is: 'email',
				then: Joi.required(),
				otherwise: Joi.optional()
			})
		})
	}),
	serviceStatusController.testService
);

// Integration test routes
router.post('/integration-test', catchAsync(async (req, res) => {
	const results = await integrationTestService.runAllTests();
	res.json({
		success: true,
		data: results
	});
}));

router.post('/integration-test/:service', 
	validate({
		params: Joi.object().keys({
			service: Joi.string().valid('ai', 'messaging', 'email', 'google', 'realtime', 'pdf').required()
		})
	}),
	catchAsync(async (req, res) => {
		const { service } = req.params;
		const result = await integrationTestService.testSpecificService(service);
		res.json({
			success: true,
			data: result
		});
	})
);

router.get('/integration-test/results', catchAsync(async (req, res) => {
	const results = integrationTestService.getTestResults();
	res.json({
		success: true,
		data: results
	});
}));

router.delete('/integration-test/results', catchAsync(async (req, res) => {
	integrationTestService.clearTestResults();
	res.json({
		success: true,
		message: 'Test results cleared'
	});
}));

export default router;
