import { Router } from 'express';
import authRoute from './authRoute';
import userRoute from './userRoute';
import roleRoute from './roleRoute';
import teamRoute from './teamRoute';
import subscriptionRoute from './subscriptionRoute';
import imageRoute from './imageRoute';
import leadRoute from './leadRoute';
import clientRoute from './clientRoute';
import projectRoute from './projectRoute';
import estimateRoute from './estimateRoute';
import moodboardRoute from './moodboardRoute';
import notificationRoute from './notificationRoute';
import googleAuthRoute from './googleAuthRoute';
import webhookRoute from './webhookRoute';
import serviceStatusRoute from './serviceStatusRoute';

const router = Router();

// Core authentication and user management
router.use('/auth', authRoute);
router.use('/users', userRoute);
router.use('/roles', roleRoute);
router.use('/teams', teamRoute);
router.use('/subscriptions', subscriptionRoute);
router.use('/images', imageRoute);

// External service integrations
router.use('/google', googleAuthRoute);
router.use('/webhooks', webhookRoute);
router.use('/services', serviceStatusRoute);

// DesignFlow Studio business features
router.use('/leads', leadRoute);
router.use('/clients', clientRoute);
router.use('/projects', projectRoute);
router.use('/estimates', estimateRoute);
router.use('/moodboards', moodboardRoute);
router.use('/notifications', notificationRoute);

export default router;
