import twilio from 'twilio';
import config from '~/config/config';
import logger from '~/config/logger';

class MessagingService {
	constructor() {
		this.client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
	}

	async sendSMS(to, message, options = {}) {
		try {
			const result = await this.client.messages.create({
				body: message,
				from: config.TWILIO_PHONE_NUMBER,
				to: this.formatPhoneNumber(to),
				...options
			});

			logger.info(`SMS sent successfully to ${to}: ${result.sid}`);
			return {
				success: true,
				messageId: result.sid,
				status: result.status
			};
		} catch (error) {
			logger.error('SMS sending failed:', error);
			throw new Error(`Failed to send SMS: ${error.message}`);
		}
	}

	async sendWhatsApp(to, message, options = {}) {
		try {
			const result = await this.client.messages.create({
				body: message,
				from: `whatsapp:${config.TWILIO_WHATSAPP_NUMBER}`,
				to: `whatsapp:${this.formatPhoneNumber(to)}`,
				...options
			});

			logger.info(`WhatsApp message sent successfully to ${to}: ${result.sid}`);
			return {
				success: true,
				messageId: result.sid,
				status: result.status
			};
		} catch (error) {
			logger.error('WhatsApp sending failed:', error);
			throw new Error(`Failed to send WhatsApp message: ${error.message}`);
		}
	}

	async sendProjectUpdate(phoneNumber, projectName, updateType, details) {
		const message = this.buildProjectUpdateMessage(projectName, updateType, details);
		
		try {
			// Try WhatsApp first, fallback to SMS
			if (config.TWILIO_WHATSAPP_NUMBER) {
				return await this.sendWhatsApp(phoneNumber, message);
			} else {
				return await this.sendSMS(phoneNumber, message);
			}
		} catch (error) {
			logger.error('Project update message failed:', error);
			throw error;
		}
	}

	async sendEstimateNotification(phoneNumber, clientName, estimateTitle, estimateUrl) {
		const message = this.buildEstimateNotificationMessage(clientName, estimateTitle, estimateUrl);
		
		try {
			if (config.TWILIO_WHATSAPP_NUMBER) {
				return await this.sendWhatsApp(phoneNumber, message);
			} else {
				return await this.sendSMS(phoneNumber, message);
			}
		} catch (error) {
			logger.error('Estimate notification failed:', error);
			throw error;
		}
	}

	async sendMoodboardNotification(phoneNumber, clientName, moodboardTitle, moodboardUrl) {
		const message = this.buildMoodboardNotificationMessage(clientName, moodboardTitle, moodboardUrl);
		
		try {
			if (config.TWILIO_WHATSAPP_NUMBER) {
				return await this.sendWhatsApp(phoneNumber, message);
			} else {
				return await this.sendSMS(phoneNumber, message);
			}
		} catch (error) {
			logger.error('Moodboard notification failed:', error);
			throw error;
		}
	}

	async sendLeadFollowUp(phoneNumber, leadName, followUpType, details) {
		const message = this.buildLeadFollowUpMessage(leadName, followUpType, details);
		
		try {
			if (config.TWILIO_WHATSAPP_NUMBER) {
				return await this.sendWhatsApp(phoneNumber, message);
			} else {
				return await this.sendSMS(phoneNumber, message);
			}
		} catch (error) {
			logger.error('Lead follow-up message failed:', error);
			throw error;
		}
	}

	async sendAppointmentReminder(phoneNumber, clientName, appointmentDate, appointmentTime, location) {
		const message = this.buildAppointmentReminderMessage(clientName, appointmentDate, appointmentTime, location);
		
		try {
			if (config.TWILIO_WHATSAPP_NUMBER) {
				return await this.sendWhatsApp(phoneNumber, message);
			} else {
				return await this.sendSMS(phoneNumber, message);
			}
		} catch (error) {
			logger.error('Appointment reminder failed:', error);
			throw error;
		}
	}

	buildProjectUpdateMessage(projectName, updateType, details) {
		const updateMessages = {
			'status_change': `🏠 Project Update: ${projectName}\n\nStatus has been updated to: ${details.status}\n\n${details.notes || 'No additional notes.'}`,
			'milestone_completed': `🎉 Milestone Completed: ${projectName}\n\n${details.milestoneName} has been completed!\n\n${details.notes || 'Great progress on your project.'}`,
			'new_photos': `📸 New Photos: ${projectName}\n\nNew progress photos have been uploaded to your project.\n\nCheck your client portal to view them.`,
			'budget_update': `💰 Budget Update: ${projectName}\n\nBudget has been updated to $${details.newBudget}\n\nPrevious budget: $${details.previousBudget}`,
			'general_update': `📋 Project Update: ${projectName}\n\n${details.message}`
		};

		return updateMessages[updateType] || updateMessages['general_update'];
	}

	buildEstimateNotificationMessage(clientName, estimateTitle, estimateUrl) {
		return `📋 New Estimate Ready: ${clientName}\n\nYour estimate "${estimateTitle}" is ready for review.\n\nView and approve: ${estimateUrl}\n\nPlease review and let us know if you have any questions!`;
	}

	buildMoodboardNotificationMessage(clientName, moodboardTitle, moodboardUrl) {
		return `🎨 New Moodboard: ${clientName}\n\nYour moodboard "${moodboardTitle}" is ready for review.\n\nView and comment: ${moodboardUrl}\n\nWe'd love to hear your thoughts!`;
	}

	buildLeadFollowUpMessage(leadName, followUpType, details) {
		const followUpMessages = {
			'initial_contact': `👋 Hello ${leadName}!\n\nThank you for your interest in our interior design services. We'd love to discuss your project in more detail.\n\nWould you be available for a brief call this week?`,
			'qualification': `🏠 Project Discussion: ${leadName}\n\nWe'd like to learn more about your interior design project to provide you with the best possible service.\n\nCould we schedule a 15-minute call to discuss your needs?`,
			'proposal_follow_up': `📋 Proposal Follow-up: ${leadName}\n\nWe've prepared a detailed proposal for your project. Have you had a chance to review it?\n\nWe're here to answer any questions you might have.`,
			'closing': `🎯 Final Follow-up: ${leadName}\n\nWe understand you're considering our services for your interior design project. Is there anything else we can help clarify?\n\nWe'd love to bring your vision to life!`
		};

		return followUpMessages[followUpType] || followUpMessages['initial_contact'];
	}

	buildAppointmentReminderMessage(clientName, appointmentDate, appointmentTime, location) {
		return `📅 Appointment Reminder: ${clientName}\n\nYou have an appointment scheduled for:\n\n📅 Date: ${appointmentDate}\n🕐 Time: ${appointmentTime}\n📍 Location: ${location}\n\nWe look forward to seeing you!`;
	}

	formatPhoneNumber(phoneNumber) {
		// Remove all non-digit characters
		const cleaned = phoneNumber.replace(/\D/g, '');
		
		// Add country code if not present
		if (cleaned.length === 10) {
			return `+1${cleaned}`;
		} else if (cleaned.length === 11 && cleaned.startsWith('1')) {
			return `+${cleaned}`;
		} else if (cleaned.startsWith('+')) {
			return phoneNumber;
		} else {
			return `+${cleaned}`;
		}
	}

	async validatePhoneNumber(phoneNumber) {
		try {
			const formattedNumber = this.formatPhoneNumber(phoneNumber);
			await this.client.lookups.v1.phoneNumbers(formattedNumber).fetch();
			return { valid: true, formatted: formattedNumber };
		} catch (error) {
			logger.error('Phone number validation failed:', error);
			return { valid: false, error: error.message };
		}
	}

	async getMessageStatus(messageId) {
		try {
			const message = await this.client.messages(messageId).fetch();
			return {
				status: message.status,
				errorCode: message.errorCode,
				errorMessage: message.errorMessage,
				dateCreated: message.dateCreated,
				dateSent: message.dateSent,
				dateUpdated: message.dateUpdated
			};
		} catch (error) {
			logger.error('Failed to get message status:', error);
			throw new Error(`Failed to get message status: ${error.message}`);
		}
	}

	async isServiceAvailable() {
		try {
			await this.client.api.accounts(config.TWILIO_ACCOUNT_SID).fetch();
			return true;
		} catch (error) {
			logger.error('Twilio service unavailable:', error);
			return false;
		}
	}
}

export default new MessagingService();
