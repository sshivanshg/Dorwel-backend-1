import nodemailer from 'nodemailer';
import logger from '~/config/logger';
import template from './template';
import config from '~/config/config';

export const transport = nodemailer.createTransport({
	host: config.SMTP_HOST,
	port: config.SMTP_PORT,
	secure: true,
	auth: {
		user: config.SMTP_USERNAME,
		pass: config.SMTP_PASSWORD
	}
});

if (config.NODE_ENV !== 'test') {
	transport
		.verify()
		.then(() => logger.info('Connected to email server'))
		.catch(() => logger.warn('Unable to connect to email server'));
}

export const sendEmail = async (to, subject, html) => {
	const msg = { from: `${config.APP_NAME} <${config.EMAIL_FROM}>`, to, subject, html };
	await transport.sendMail(msg);
};

export const sendResetPasswordEmail = async (to, token) => {
	const subject = 'Reset password';
	const resetPasswordUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;
	const html = template.resetPassword(resetPasswordUrl, config.APP_NAME);
	await sendEmail(to, subject, html);
};

export const sendVerificationEmail = async (to, token) => {
	const subject = 'Email Verification';
	const verificationEmailUrl = `${config.FRONTEND_URL}/verify-email?token=${token}`;
	const html = template.verifyEmail(verificationEmailUrl, config.APP_NAME);
	await sendEmail(to, subject, html);
};

// DesignFlow Studio specific email functions
export const sendWelcomeEmail = async (user) => {
	const subject = 'Welcome to DesignFlow Studio!';
	const html = template.welcomeEmail(user, config.APP_NAME);
	await sendEmail(user.email, subject, html);
};

export const sendEstimateEmail = async (estimate, client) => {
	const subject = `Your Estimate: ${estimate.title}`;
	const html = template.estimateEmail(estimate, client, config.APP_NAME);
	await sendEmail(client.email, subject, html);
};

export const sendProjectUpdateEmail = async (project, client, updateType, details) => {
	const subject = `Project Update: ${project.name}`;
	const html = template.projectUpdateEmail(project, client, updateType, details, config.APP_NAME);
	await sendEmail(client.email, subject, html);
};

export const sendMoodboardEmail = async (moodboard, client) => {
	const subject = `New Moodboard: ${moodboard.title}`;
	const html = template.moodboardEmail(moodboard, client, config.APP_NAME);
	await sendEmail(client.email, subject, html);
};

export const sendAppointmentReminderEmail = async (client, appointment) => {
	const subject = `Appointment Reminder - ${appointment.date}`;
	const html = template.appointmentReminderEmail(client, appointment, config.APP_NAME);
	await sendEmail(client.email, subject, html);
};

export const sendEmailWithAttachment = async (to, subject, html, attachments = []) => {
	const msg = { 
		from: `${config.APP_NAME} <${config.EMAIL_FROM}>`, 
		to, 
		subject, 
		html,
		attachments
	};
	await transport.sendMail(msg);
};

export const isServiceAvailable = async () => {
	try {
		await transport.verify();
		return true;
	} catch (error) {
		logger.error('Email service unavailable:', error);
		return false;
	}
};

export default { 
	sendEmail, 
	sendResetPasswordEmail, 
	sendVerificationEmail,
	sendWelcomeEmail,
	sendEstimateEmail,
	sendProjectUpdateEmail,
	sendMoodboardEmail,
	sendAppointmentReminderEmail,
	sendEmailWithAttachment,
	isServiceAvailable
};
