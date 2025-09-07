import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from '~/config/config';
import logger from '~/config/logger';
import User from '~/models/userModel';
import jwtService from './jwtService';

class GoogleOAuthService {
	constructor() {
		this.initializeStrategy();
	}

	initializeStrategy() {
		passport.use(new GoogleStrategy({
			clientID: config.GOOGLE_CLIENT_ID,
			clientSecret: config.GOOGLE_CLIENT_SECRET,
			callbackURL: config.GOOGLE_REDIRECT_URI
		}, this.handleGoogleCallback.bind(this)));
	}

	async handleGoogleCallback(accessToken, refreshToken, profile, done) {
		try {
			// Extract user information from Google profile
			const googleId = profile.id;
			const email = profile.emails[0].value;
			const firstName = profile.name.givenName;
			const lastName = profile.name.familyName;
			const avatar = profile.photos[0]?.value;

			// Check if user already exists
			let user = await User.getUserByEmail(email);

			if (user) {
				// Update existing user with Google ID if not already set
				if (!user.googleId) {
					user.googleId = googleId;
					user.avatar = avatar || user.avatar;
					await user.save();
				}
			} else {
				// Create new user
				user = await User.createUser({
					firstName,
					lastName,
					email,
					userName: this.generateUserName(firstName, lastName),
					password: this.generateRandomPassword(), // Will be hashed by pre-save middleware
					avatar: avatar || 'default-avatar.png',
					confirmed: true, // Google users are pre-verified
					googleId,
					authProvider: 'google'
				});
			}

			// Generate JWT tokens
			const tokens = await jwtService.generateAuthTokens(user);

			return done(null, {
				user,
				tokens
			});
		} catch (error) {
			logger.error('Google OAuth callback error:', error);
			return done(error, null);
		}
	}

	generateUserName(firstName, lastName) {
		const baseUserName = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
		return baseUserName;
	}

	generateRandomPassword() {
		// Generate a random password since Google OAuth users don't need a password
		// This will be hashed by the pre-save middleware
		return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
	}

	getAuthURL() {
		const params = new URLSearchParams({
			client_id: config.GOOGLE_CLIENT_ID,
			redirect_uri: config.GOOGLE_REDIRECT_URI,
			scope: 'profile email',
			response_type: 'code',
			access_type: 'offline',
			prompt: 'consent'
		});

		return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
	}

	async exchangeCodeForTokens(code) {
		try {
			const response = await fetch('https://oauth2.googleapis.com/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					client_id: config.GOOGLE_CLIENT_ID,
					client_secret: config.GOOGLE_CLIENT_SECRET,
					code,
					grant_type: 'authorization_code',
					redirect_uri: config.GOOGLE_REDIRECT_URI,
				}),
			});

			if (!response.ok) {
				throw new Error(`Token exchange failed: ${response.statusText}`);
			}

			const tokens = await response.json();
			return tokens;
		} catch (error) {
			logger.error('Token exchange error:', error);
			throw new Error('Failed to exchange code for tokens');
		}
	}

	async getUserInfo(accessToken) {
		try {
			const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to get user info: ${response.statusText}`);
			}

			const userInfo = await response.json();
			return userInfo;
		} catch (error) {
			logger.error('Get user info error:', error);
			throw new Error('Failed to get user information from Google');
		}
	}

	async refreshAccessToken(refreshToken) {
		try {
			const response = await fetch('https://oauth2.googleapis.com/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					client_id: config.GOOGLE_CLIENT_ID,
					client_secret: config.GOOGLE_CLIENT_SECRET,
					refresh_token: refreshToken,
					grant_type: 'refresh_token',
				}),
			});

			if (!response.ok) {
				throw new Error(`Token refresh failed: ${response.statusText}`);
			}

			const tokens = await response.json();
			return tokens;
		} catch (error) {
			logger.error('Token refresh error:', error);
			throw new Error('Failed to refresh access token');
		}
	}

	async revokeToken(accessToken) {
		try {
			const response = await fetch('https://oauth2.googleapis.com/revoke', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					token: accessToken,
				}),
			});

			return response.ok;
		} catch (error) {
			logger.error('Token revocation error:', error);
			return false;
		}
	}

	async isServiceAvailable() {
		try {
			// Test if we can make a request to Google's OAuth endpoint
			const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
				method: 'GET',
			});
			return response.ok;
		} catch (error) {
			logger.error('Google OAuth service unavailable:', error);
			return false;
		}
	}

	// Middleware for passport authentication
	getPassportMiddleware() {
		return passport.authenticate('google', {
			scope: ['profile', 'email'],
			session: false
		});
	}

	getCallbackMiddleware() {
		return passport.authenticate('google', {
			failureRedirect: `${config.FRONTEND_URL}/auth/error`,
			session: false
		});
	}
}

export default new GoogleOAuthService();
