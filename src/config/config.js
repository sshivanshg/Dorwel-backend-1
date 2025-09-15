import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envValidate = Joi.object()
	.keys({
		NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
		APP_NAME: Joi.string().allow('').empty('').default('Dorwel - Interior Design Management'),
		HOST: Joi.string().allow('').empty('').default('0.0.0.0'),
		PORT: Joi.number().allow('').empty('').default(666),

		DATABASE_URI: Joi.string().required(),

		JWT_ACCESS_TOKEN_SECRET_PRIVATE: Joi.string().required(),
		JWT_ACCESS_TOKEN_SECRET_PUBLIC: Joi.string().required(),
		JWT_ACCESS_TOKEN_EXPIRATION_MINUTES: Joi.number().allow('').empty('').default(240),

		REFRESH_TOKEN_EXPIRATION_DAYS: Joi.number().allow('').empty('').default(1),
		VERIFY_EMAIL_TOKEN_EXPIRATION_MINUTES: Joi.number().allow('').empty('').default(60),
		RESET_PASSWORD_TOKEN_EXPIRATION_MINUTES: Joi.number().allow('').empty('').default(30),

		SMTP_HOST: Joi.string().allow('').empty(''),
		SMTP_PORT: Joi.number().allow('').empty(''),
		SMTP_USERNAME: Joi.string().allow('').empty(''),
		SMTP_PASSWORD: Joi.string().allow('').empty(''),
		EMAIL_FROM: Joi.string().allow('').empty(''),

		FRONTEND_URL: Joi.string().allow('').empty('').default('http://localhost:777'),
		IMAGE_URL: Joi.string().allow('').empty('').default('http://localhost:666/images'),

		// Google OAuth
		GOOGLE_CLIENT_ID: Joi.string().allow('').empty(''),
		GOOGLE_CLIENT_SECRET: Joi.string().allow('').empty(''),
		GOOGLE_REDIRECT_URI: Joi.string().allow('').empty('').default('http://localhost:666/api/v1/auth/google/callback'),

		// Twilio (WhatsApp/SMS)
		TWILIO_ACCOUNT_SID: Joi.string().allow('').empty(''),
		TWILIO_AUTH_TOKEN: Joi.string().allow('').empty(''),
		TWILIO_PHONE_NUMBER: Joi.string().allow('').empty(''),
		TWILIO_WHATSAPP_NUMBER: Joi.string().allow('').empty(''),

		// OpenAI
		OPENAI_API_KEY: Joi.string().allow('').empty(''),
		OPENAI_MODEL: Joi.string().allow('').empty('').default('gpt-4'),
		OPENAI_MAX_TOKENS: Joi.number().allow('').empty('').default(2000),

		// PDF Generation
		PDF_STORAGE_PATH: Joi.string().allow('').empty('').default('./storage/pdfs'),
		PDF_PUBLIC_URL: Joi.string().allow('').empty('').default('http://localhost:666/pdfs'),

		// File Upload
		MAX_FILE_SIZE: Joi.number().allow('').empty('').default(10485760), // 10MB
		ALLOWED_FILE_TYPES: Joi.string().allow('').empty('').default('image/jpeg,image/png,image/gif,image/webp,application/pdf'),

		// Rate Limiting
		RATE_LIMIT_WINDOW_MS: Joi.number().allow('').empty('').default(900000), // 15 minutes
		RATE_LIMIT_MAX_REQUESTS: Joi.number().allow('').empty('').default(100),

		// JWT Refresh Token
		JWT_REFRESH_TOKEN_SECRET: Joi.string().allow('').empty(''),
		JWT_REFRESH_TOKEN_EXPIRATION_DAYS: Joi.number().allow('').empty('').default(7),

		// Webhook Secrets
		TWILIO_WEBHOOK_SECRET: Joi.string().allow('').empty(''),
		OPENAI_WEBHOOK_SECRET: Joi.string().allow('').empty(''),
		GOOGLE_WEBHOOK_SECRET: Joi.string().allow('').empty(''),

		// Razorpay Configuration
		RAZORPAY_KEY_ID: Joi.string().allow('').empty(''),
		RAZORPAY_KEY_SECRET: Joi.string().allow('').empty(''),
		RAZORPAY_WEBHOOK_SECRET: Joi.string().allow('').empty('')
	})
	.unknown();

const { value: env, error } = envValidate.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
	throw new Error(`Config env error: ${error.message}`);
}

export default {
	NODE_ENV: env.NODE_ENV,
	APP_NAME: env.APP_NAME,
	HOST: env.HOST,
	PORT: env.PORT,

	DATABASE_URI: env.DATABASE_URI,
	DATABASE_OPTIONS: {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		retryWrites: true,
		w: 'majority'
	},

	JWT_ACCESS_TOKEN_SECRET_PRIVATE: Buffer.from(env.JWT_ACCESS_TOKEN_SECRET_PRIVATE, 'base64'),
	JWT_ACCESS_TOKEN_SECRET_PUBLIC: Buffer.from(env.JWT_ACCESS_TOKEN_SECRET_PUBLIC, 'base64'),
	JWT_ACCESS_TOKEN_EXPIRATION_MINUTES: env.JWT_ACCESS_TOKEN_EXPIRATION_MINUTES,

	REFRESH_TOKEN_EXPIRATION_DAYS: env.REFRESH_TOKEN_EXPIRATION_DAYS,
	VERIFY_EMAIL_TOKEN_EXPIRATION_MINUTES: env.VERIFY_EMAIL_TOKEN_EXPIRATION_MINUTES,
	RESET_PASSWORD_TOKEN_EXPIRATION_MINUTES: env.RESET_PASSWORD_TOKEN_EXPIRATION_MINUTES,

	SMTP_HOST: env.SMTP_HOST,
	SMTP_PORT: env.SMTP_PORT,
	SMTP_USERNAME: env.SMTP_USERNAME,
	SMTP_PASSWORD: env.SMTP_PASSWORD,
	EMAIL_FROM: env.EMAIL_FROM,

	FRONTEND_URL: env.FRONTEND_URL,

	IMAGE_URL: env.IMAGE_URL,

	// Google OAuth
	GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
	GOOGLE_REDIRECT_URI: env.GOOGLE_REDIRECT_URI,

	// Twilio (WhatsApp/SMS)
	TWILIO_ACCOUNT_SID: env.TWILIO_ACCOUNT_SID,
	TWILIO_AUTH_TOKEN: env.TWILIO_AUTH_TOKEN,
	TWILIO_PHONE_NUMBER: env.TWILIO_PHONE_NUMBER,
	TWILIO_WHATSAPP_NUMBER: env.TWILIO_WHATSAPP_NUMBER,

	// OpenAI
	OPENAI_API_KEY: env.OPENAI_API_KEY,
	OPENAI_MODEL: env.OPENAI_MODEL,
	OPENAI_MAX_TOKENS: env.OPENAI_MAX_TOKENS,

	// PDF Generation
	PDF_STORAGE_PATH: env.PDF_STORAGE_PATH,
	PDF_PUBLIC_URL: env.PDF_PUBLIC_URL,

	// File Upload
	MAX_FILE_SIZE: env.MAX_FILE_SIZE,
	ALLOWED_FILE_TYPES: env.ALLOWED_FILE_TYPES.split(','),

	// Rate Limiting
	RATE_LIMIT_WINDOW_MS: env.RATE_LIMIT_WINDOW_MS,
	RATE_LIMIT_MAX_REQUESTS: env.RATE_LIMIT_MAX_REQUESTS,

	// JWT Refresh Token
	JWT_REFRESH_TOKEN_SECRET: env.JWT_REFRESH_TOKEN_SECRET,
	JWT_REFRESH_TOKEN_EXPIRATION_DAYS: env.JWT_REFRESH_TOKEN_EXPIRATION_DAYS,

	// Webhook Secrets
	TWILIO_WEBHOOK_SECRET: env.TWILIO_WEBHOOK_SECRET,
	OPENAI_WEBHOOK_SECRET: env.OPENAI_WEBHOOK_SECRET,
	GOOGLE_WEBHOOK_SECRET: env.GOOGLE_WEBHOOK_SECRET,

	// Razorpay Configuration
	RAZORPAY_KEY_ID: env.RAZORPAY_KEY_ID,
	RAZORPAY_KEY_SECRET: env.RAZORPAY_KEY_SECRET,
	RAZORPAY_WEBHOOK_SECRET: env.RAZORPAY_WEBHOOK_SECRET,

	TOKEN_TYPES: {
		REFRESH: 'refresh',
		VERIFY_EMAIL: 'verifyEmail',
		RESET_PASSWORD: 'resetPassword'
	}
};
