import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import config from '~/config/config';
import logger from '~/config/logger';

class PDFService {
	constructor() {
		this.ensureStorageDirectory();
	}

	ensureStorageDirectory() {
		const dir = config.PDF_STORAGE_PATH;
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
	}

	async generateEstimatePDF(estimate, options = {}) {
		try {
			const filename = `estimate_${estimate._id}_${Date.now()}.pdf`;
			const filepath = path.join(config.PDF_STORAGE_PATH, filename);
			const publicUrl = `${config.PDF_PUBLIC_URL}/${filename}`;

			const doc = new PDFDocument({ 
				size: 'A4',
				margin: 50,
				info: {
					Title: `Estimate - ${estimate.title}`,
					Author: 'DesignFlow Studio',
					Subject: 'Interior Design Estimate',
					Keywords: 'interior design, estimate, proposal'
				}
			});

			// Pipe the PDF to a file
			doc.pipe(fs.createWriteStream(filepath));

			// Header
			this.addHeader(doc, estimate);

			// Client Information
			this.addClientInfo(doc, estimate);

			// Project Description
			this.addProjectDescription(doc, estimate);

			// Estimate Items
			this.addEstimateItems(doc, estimate);

			// Pricing Summary
			this.addPricingSummary(doc, estimate);

			// Terms and Conditions
			this.addTermsAndConditions(doc, estimate);

			// Footer
			this.addFooter(doc, estimate);

			// Finalize the PDF
			doc.end();

			return new Promise((resolve, reject) => {
				doc.on('end', () => {
					logger.info(`Estimate PDF generated: ${filepath}`);
					resolve({
						filename,
						filepath,
						publicUrl,
						size: fs.statSync(filepath).size
					});
				});

				doc.on('error', (error) => {
					logger.error('PDF generation error:', error);
					reject(error);
				});
			});
		} catch (error) {
			logger.error('PDF generation failed:', error);
			throw new Error(`Failed to generate PDF: ${error.message}`);
		}
	}

	async generateProjectReportPDF(project, options = {}) {
		try {
			const filename = `project_report_${project._id}_${Date.now()}.pdf`;
			const filepath = path.join(config.PDF_STORAGE_PATH, filename);
			const publicUrl = `${config.PDF_PUBLIC_URL}/${filename}`;

			const doc = new PDFDocument({ 
				size: 'A4',
				margin: 50,
				info: {
					Title: `Project Report - ${project.name}`,
					Author: 'DesignFlow Studio',
					Subject: 'Project Progress Report',
					Keywords: 'interior design, project, report, progress'
				}
			});

			doc.pipe(fs.createWriteStream(filepath));

			// Header
			this.addProjectReportHeader(doc, project);

			// Project Overview
			this.addProjectOverview(doc, project);

			// Progress Summary
			this.addProgressSummary(doc, project);

			// Milestones
			this.addMilestones(doc, project);

			// Budget Summary
			this.addBudgetSummary(doc, project);

			// Next Steps
			this.addNextSteps(doc, project);

			// Footer
			this.addFooter(doc, project);

			doc.end();

			return new Promise((resolve, reject) => {
				doc.on('end', () => {
					logger.info(`Project report PDF generated: ${filepath}`);
					resolve({
						filename,
						filepath,
						publicUrl,
						size: fs.statSync(filepath).size
					});
				});

				doc.on('error', (error) => {
					logger.error('PDF generation error:', error);
					reject(error);
				});
			});
		} catch (error) {
			logger.error('Project report PDF generation failed:', error);
			throw new Error(`Failed to generate project report PDF: ${error.message}`);
		}
	}

	addHeader(doc, estimate) {
		// Company Logo/Title
		doc.fontSize(24)
			.fillColor('#2c3e50')
			.text('DesignFlow Studio', 50, 50);

		doc.fontSize(12)
			.fillColor('#7f8c8d')
			.text('Interior Design & Project Management', 50, 80);

		// Estimate Title
		doc.fontSize(18)
			.fillColor('#34495e')
			.text(estimate.title, 50, 120);

		// Estimate Info
		doc.fontSize(10)
			.fillColor('#7f8c8d')
			.text(`Estimate #${estimate._id}`, 50, 150)
			.text(`Date: ${new Date(estimate.createdAt).toLocaleDateString()}`, 200, 150)
			.text(`Version: ${estimate.version}`, 350, 150)
			.text(`Status: ${estimate.status.toUpperCase()}`, 450, 150);

		// Line separator
		doc.moveTo(50, 170)
			.lineTo(550, 170)
			.stroke('#bdc3c7');
	}

	addClientInfo(doc, estimate) {
		doc.fontSize(14)
			.fillColor('#2c3e50')
			.text('Client Information', 50, 200);

		doc.fontSize(10)
			.fillColor('#34495e')
			.text(`Name: ${estimate.client.firstName} ${estimate.client.lastName}`, 50, 230)
			.text(`Email: ${estimate.client.email}`, 50, 250)
			.text(`Phone: ${estimate.client.phone}`, 50, 270);

		if (estimate.client.company) {
			doc.text(`Company: ${estimate.client.company}`, 50, 290);
		}
	}

	addProjectDescription(doc, estimate) {
		doc.fontSize(14)
			.fillColor('#2c3e50')
			.text('Project Description', 50, 330);

		doc.fontSize(10)
			.fillColor('#34495e')
			.text(estimate.description, 50, 360, {
				width: 500,
				align: 'justify'
			});
	}

	addEstimateItems(doc, estimate) {
		doc.fontSize(14)
			.fillColor('#2c3e50')
			.text('Estimate Items', 50, 420);

		// Table header
		const startY = 450;
		let currentY = startY;

		// Header row
		doc.fontSize(10)
			.fillColor('#ffffff')
			.rect(50, currentY, 500, 25)
			.fill('#34495e');

		doc.text('Item', 55, currentY + 8);
		doc.text('Description', 150, currentY + 8);
		doc.text('Qty', 350, currentY + 8);
		doc.text('Unit Price', 380, currentY + 8);
		doc.text('Total', 450, currentY + 8);

		currentY += 25;

		// Items
		estimate.items.forEach((item, index) => {
			const isEven = index % 2 === 0;
			const bgColor = isEven ? '#f8f9fa' : '#ffffff';

			doc.fillColor(bgColor)
				.rect(50, currentY, 500, 30)
				.fill();

			doc.fillColor('#2c3e50')
				.fontSize(9)
				.text(item.name, 55, currentY + 8, { width: 90 })
				.text(item.description, 150, currentY + 8, { width: 190 })
				.text(item.quantity.toString(), 350, currentY + 8)
				.text(`$${item.unitPrice.toFixed(2)}`, 380, currentY + 8)
				.text(`$${item.totalPrice.toFixed(2)}`, 450, currentY + 8);

			currentY += 30;
		});

		// Add some space after the table
		currentY += 20;
	}

	addPricingSummary(doc, estimate) {
		const pricing = estimate.pricing;
		const startY = 600;

		doc.fontSize(14)
			.fillColor('#2c3e50')
			.text('Pricing Summary', 50, startY);

		// Pricing details
		doc.fontSize(10)
			.fillColor('#34495e')
			.text(`Subtotal:`, 400, startY + 30)
			.text(`$${pricing.subtotal.toFixed(2)}`, 500, startY + 30);

		if (pricing.taxRate > 0) {
			doc.text(`Tax (${pricing.taxRate}%):`, 400, startY + 50)
				.text(`$${pricing.taxAmount.toFixed(2)}`, 500, startY + 50);
		}

		if (pricing.discountRate > 0) {
			doc.text(`Discount (${pricing.discountRate}%):`, 400, startY + 70)
				.text(`-$${pricing.discountAmount.toFixed(2)}`, 500, startY + 70);
		}

		// Total
		doc.fontSize(12)
			.fillColor('#2c3e50')
			.text(`Total:`, 400, startY + 100)
			.text(`$${pricing.totalAmount.toFixed(2)}`, 500, startY + 100);

		// Line separator
		doc.moveTo(400, startY + 120)
			.lineTo(550, startY + 120)
			.stroke('#2c3e50');
	}

	addTermsAndConditions(doc, estimate) {
		const startY = 750;

		doc.fontSize(12)
			.fillColor('#2c3e50')
			.text('Terms & Conditions', 50, startY);

		doc.fontSize(9)
			.fillColor('#34495e')
			.text(`Payment Terms: ${estimate.terms.paymentTerms}`, 50, startY + 25)
			.text(`Deposit Required: ${estimate.terms.depositRequired}% ($${estimate.terms.depositAmount.toFixed(2)})`, 50, startY + 45)
			.text(`Valid Until: ${new Date(estimate.validity.validUntil).toLocaleDateString()}`, 50, startY + 65);

		if (estimate.terms.additionalTerms) {
			doc.text(`Additional Terms: ${estimate.terms.additionalTerms}`, 50, startY + 85, {
				width: 500,
				align: 'justify'
			});
		}
	}

	addProjectReportHeader(doc, project) {
		doc.fontSize(24)
			.fillColor('#2c3e50')
			.text('DesignFlow Studio', 50, 50);

		doc.fontSize(12)
			.fillColor('#7f8c8d')
			.text('Project Progress Report', 50, 80);

		doc.fontSize(18)
			.fillColor('#34495e')
			.text(project.name, 50, 120);

		doc.fontSize(10)
			.fillColor('#7f8c8d')
			.text(`Project #${project._id}`, 50, 150)
			.text(`Status: ${project.status.toUpperCase()}`, 200, 150)
			.text(`Progress: ${project.progress.percentage}%`, 350, 150)
			.text(`Report Date: ${new Date().toLocaleDateString()}`, 450, 150);
	}

	addProjectOverview(doc, project) {
		doc.fontSize(14)
			.fillColor('#2c3e50')
			.text('Project Overview', 50, 200);

		doc.fontSize(10)
			.fillColor('#34495e')
			.text(`Description: ${project.description}`, 50, 230, {
				width: 500,
				align: 'justify'
			})
			.text(`Type: ${project.projectType}`, 50, 280)
			.text(`Size: ${project.projectSize}`, 200, 280)
			.text(`Location: ${project.fullAddress}`, 50, 300);
	}

	addProgressSummary(doc, project) {
		doc.fontSize(14)
			.fillColor('#2c3e50')
			.text('Progress Summary', 50, 350);

		// Progress bar
		const progressWidth = 400;
		const progressHeight = 20;
		const progressX = 50;
		const progressY = 380;

		// Background
		doc.rect(progressX, progressY, progressWidth, progressHeight)
			.fill('#ecf0f1');

		// Progress fill
		const fillWidth = (progressWidth * project.progress.percentage) / 100;
		doc.rect(progressX, progressY, fillWidth, progressHeight)
			.fill('#3498db');

		// Progress text
		doc.fontSize(12)
			.fillColor('#2c3e50')
			.text(`${project.progress.percentage}% Complete`, progressX + progressWidth + 20, progressY + 5);
	}

	addMilestones(doc, project) {
		doc.fontSize(14)
			.fillColor('#2c3e50')
			.text('Project Milestones', 50, 430);

		let currentY = 460;
		project.milestones.forEach((milestone, index) => {
			const statusColor = {
				'pending': '#f39c12',
				'in_progress': '#3498db',
				'completed': '#27ae60',
				'overdue': '#e74c3c'
			}[milestone.status] || '#95a5a6';

			// Status indicator
			doc.circle(60, currentY + 5, 3)
				.fill(statusColor);

			// Milestone details
			doc.fontSize(10)
				.fillColor('#2c3e50')
				.text(milestone.name, 75, currentY)
				.text(`Due: ${new Date(milestone.dueDate).toLocaleDateString()}`, 75, currentY + 15)
				.text(`Status: ${milestone.status}`, 300, currentY + 15);

			currentY += 40;
		});
	}

	addBudgetSummary(doc, project) {
		doc.fontSize(14)
			.fillColor('#2c3e50')
			.text('Budget Summary', 50, 600);

		doc.fontSize(10)
			.fillColor('#34495e')
			.text(`Estimated Budget: $${project.budget.estimated.toFixed(2)}`, 50, 630)
			.text(`Actual Spend: $${project.budget.actual.toFixed(2)}`, 50, 650)
			.text(`Remaining: $${(project.budget.estimated - project.budget.actual).toFixed(2)}`, 50, 670);
	}

	addNextSteps(doc, project) {
		doc.fontSize(14)
			.fillColor('#2c3e50')
			.text('Next Steps', 50, 720);

		// Get next milestone
		const nextMilestone = project.milestones
			.filter(m => m.status === 'pending')
			.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

		if (nextMilestone) {
			doc.fontSize(10)
				.fillColor('#34495e')
				.text(`Next: ${nextMilestone.name}`, 50, 750)
				.text(`Due: ${new Date(nextMilestone.dueDate).toLocaleDateString()}`, 50, 770);
		}
	}

	addFooter(doc, data) {
		const pageHeight = doc.page.height;
		const footerY = pageHeight - 100;

		// Line separator
		doc.moveTo(50, footerY)
			.lineTo(550, footerY)
			.stroke('#bdc3c7');

		doc.fontSize(8)
			.fillColor('#7f8c8d')
			.text('DesignFlow Studio - Interior Design & Project Management', 50, footerY + 10)
			.text('www.designflowstudio.com | info@designflowstudio.com | (555) 123-4567', 50, footerY + 25)
			.text(`Generated on ${new Date().toLocaleString()}`, 50, footerY + 40);
	}

	async deletePDF(filename) {
		try {
			const filepath = path.join(config.PDF_STORAGE_PATH, filename);
			if (fs.existsSync(filepath)) {
				fs.unlinkSync(filepath);
				logger.info(`PDF deleted: ${filepath}`);
				return true;
			}
			return false;
		} catch (error) {
			logger.error('Failed to delete PDF:', error);
			throw new Error(`Failed to delete PDF: ${error.message}`);
		}
	}

	async getPDFInfo(filename) {
		try {
			const filepath = path.join(config.PDF_STORAGE_PATH, filename);
			if (fs.existsSync(filepath)) {
				const stats = fs.statSync(filepath);
				return {
					exists: true,
					size: stats.size,
					created: stats.birthtime,
					modified: stats.mtime,
					publicUrl: `${config.PDF_PUBLIC_URL}/${filename}`
				};
			}
			return { exists: false };
		} catch (error) {
			logger.error('Failed to get PDF info:', error);
			throw new Error(`Failed to get PDF info: ${error.message}`);
		}
	}
}

export default new PDFService();
