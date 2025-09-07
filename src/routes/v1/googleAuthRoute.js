import { Router } from 'express';
import googleOAuthService from '~/services/googleOAuthService';
import authenticate from '~/middlewares/authenticate';
import catchAsync from '~/utils/catchAsync';
import httpStatus from 'http-status';

const router = Router();

// Google OAuth routes
router.get('/auth/google', googleOAuthService.getPassportMiddleware());

router.get('/auth/google/callback', 
	googleOAuthService.getCallbackMiddleware(),
	catchAsync(async (req, res) => {
		const { user, tokens } = req.user;
		
		// Set tokens in cookies or return them
		res.cookie('accessToken', tokens.access, { 
			httpOnly: true, 
			secure: process.env.NODE_ENV === 'production',
			maxAge: 24 * 60 * 60 * 1000 // 24 hours
		});
		
		res.cookie('refreshToken', tokens.refresh, { 
			httpOnly: true, 
			secure: process.env.NODE_ENV === 'production',
			maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
		});

		// Redirect to frontend with success
		res.redirect(`${process.env.FRONTEND_URL}/auth/success?user=${encodeURIComponent(JSON.stringify({
			id: user._id,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			avatar: user.avatar
		}))}`);
	})
);

// Get Google OAuth URL
router.get('/auth/google/url', catchAsync(async (req, res) => {
	const authUrl = googleOAuthService.getAuthURL();
	
	res.json({
		success: true,
		data: {
			authUrl
		}
	});
}));

// Exchange code for tokens (for mobile apps)
router.post('/auth/google/exchange', catchAsync(async (req, res) => {
	const { code } = req.body;
	
	if (!code) {
		return res.status(httpStatus.BAD_REQUEST).json({
			success: false,
			message: 'Authorization code is required'
		});
	}

	const tokens = await googleOAuthService.exchangeCodeForTokens(code);
	const userInfo = await googleOAuthService.getUserInfo(tokens.access_token);
	
	res.json({
		success: true,
		data: {
			tokens,
			userInfo
		}
	});
}));

// Refresh Google access token
router.post('/auth/google/refresh', catchAsync(async (req, res) => {
	const { refreshToken } = req.body;
	
	if (!refreshToken) {
		return res.status(httpStatus.BAD_REQUEST).json({
			success: false,
			message: 'Refresh token is required'
		});
	}

	const tokens = await googleOAuthService.refreshAccessToken(refreshToken);
	
	res.json({
		success: true,
		data: tokens
	});
}));

// Revoke Google token
router.post('/auth/google/revoke', authenticate, catchAsync(async (req, res) => {
	const { accessToken } = req.body;
	
	if (!accessToken) {
		return res.status(httpStatus.BAD_REQUEST).json({
			success: false,
			message: 'Access token is required'
		});
	}

	const success = await googleOAuthService.revokeToken(accessToken);
	
	res.json({
		success,
		message: success ? 'Token revoked successfully' : 'Failed to revoke token'
	});
}));

// Check Google OAuth service status
router.get('/auth/google/status', catchAsync(async (req, res) => {
	const isAvailable = await googleOAuthService.isServiceAvailable();
	
	res.json({
		success: true,
		data: {
			available: isAvailable,
			service: 'Google OAuth'
		}
	});
}));

export default router;
