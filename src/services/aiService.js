import OpenAI from 'openai';
import config from '~/config/config';
import logger from '~/config/logger';

class AIService {
	constructor() {
		this.openai = new OpenAI({
			apiKey: config.OPENAI_API_KEY
		});
	}

	async generateEstimateItems(projectDescription, projectType, projectSize, budget) {
		try {
			const prompt = this.buildEstimatePrompt(projectDescription, projectType, projectSize, budget);
			
			const completion = await this.openai.chat.completions.create({
				model: config.OPENAI_MODEL,
				messages: [
					{
						role: 'system',
						content: 'You are an expert interior designer and cost estimator. Generate detailed, accurate cost estimates for interior design projects. Always provide realistic pricing based on current market rates.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				max_tokens: config.OPENAI_MAX_TOKENS,
				temperature: 0.3
			});

			const response = completion.choices[0].message.content;
			return this.parseEstimateResponse(response);
		} catch (error) {
			logger.error('AI Service Error:', error);
			throw new Error('Failed to generate AI estimate');
		}
	}

	buildEstimatePrompt(projectDescription, projectType, projectSize, budget) {
		const sizeMultiplier = this.getSizeMultiplier(projectSize);
		const budgetRange = this.getBudgetRange(budget);

		return `
Generate a detailed cost estimate for an interior design project with the following specifications:

Project Description: ${projectDescription}
Project Type: ${projectType}
Project Size: ${projectSize} (${sizeMultiplier}x multiplier)
Budget Range: ${budgetRange}

Please provide a JSON response with the following structure:
{
  "items": [
    {
      "category": "design|materials|labor|furniture|lighting|decor|installation|other",
      "name": "Item name",
      "description": "Detailed description",
      "quantity": number,
      "unit": "each|sqft|sqm|linear_ft|hour|day|week|month|other",
      "unitPrice": number,
      "notes": "Additional notes",
      "isAIGenerated": true
    }
  ],
  "confidence": 0.85,
  "reasoning": "Brief explanation of the estimate approach"
}

Guidelines:
- Use realistic market prices for ${projectType} projects
- Consider the ${projectSize} size with appropriate scaling
- Include all major categories: design, materials, labor, furniture, lighting, decor, installation
- Ensure total estimate aligns with budget range
- Provide detailed descriptions for each item
- Use appropriate units (sqft for flooring, each for furniture, etc.)
- Include professional design consultation fees
- Consider regional pricing variations
- Add contingency for unexpected costs (5-10%)
		`.trim();
	}

	getSizeMultiplier(projectSize) {
		const multipliers = {
			'small': 1,
			'medium': 1.5,
			'large': 2.5,
			'extra-large': 4
		};
		return multipliers[projectSize] || 1;
	}

	getBudgetRange(budget) {
		if (!budget) return 'Not specified';
		if (budget < 10000) return 'Under $10,000';
		if (budget < 25000) return '$10,000 - $25,000';
		if (budget < 50000) return '$25,000 - $50,000';
		if (budget < 100000) return '$50,000 - $100,000';
		return 'Over $100,000';
	}

	parseEstimateResponse(response) {
		try {
			// Extract JSON from response (in case there's additional text)
			const jsonMatch = response.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				throw new Error('No JSON found in AI response');
			}

			const parsed = JSON.parse(jsonMatch[0]);
			
			// Validate and clean the response
			if (!parsed.items || !Array.isArray(parsed.items)) {
				throw new Error('Invalid items array in AI response');
			}

			// Clean and validate each item
			const cleanedItems = parsed.items.map(item => ({
				category: item.category || 'other',
				name: item.name || 'Unnamed Item',
				description: item.description || '',
				quantity: Math.max(1, item.quantity || 1),
				unit: item.unit || 'each',
				unitPrice: Math.max(0, item.unitPrice || 0),
				notes: item.notes || '',
				isAIGenerated: true
			}));

			return {
				items: cleanedItems,
				confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
				reasoning: parsed.reasoning || 'AI-generated estimate based on project specifications'
			};
		} catch (error) {
			logger.error('Error parsing AI response:', error);
			throw new Error('Failed to parse AI estimate response');
		}
	}

	async generateMoodboardSuggestions(projectDescription, style, colorScheme, budget) {
		try {
			const prompt = this.buildMoodboardPrompt(projectDescription, style, colorScheme, budget);
			
			const completion = await this.openai.chat.completions.create({
				model: config.OPENAI_MODEL,
				messages: [
					{
						role: 'system',
						content: 'You are an expert interior designer. Generate creative moodboard suggestions with specific design elements, colors, materials, and furniture recommendations.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				max_tokens: config.OPENAI_MAX_TOKENS,
				temperature: 0.7
			});

			const response = completion.choices[0].message.content;
			return this.parseMoodboardResponse(response);
		} catch (error) {
			logger.error('AI Moodboard Service Error:', error);
			throw new Error('Failed to generate AI moodboard suggestions');
		}
	}

	buildMoodboardPrompt(projectDescription, style, colorScheme, budget) {
		return `
Generate moodboard suggestions for an interior design project:

Project Description: ${projectDescription}
Style: ${style || 'Not specified'}
Color Scheme: ${colorScheme || 'Not specified'}
Budget: ${budget ? `$${budget}` : 'Not specified'}

Please provide a JSON response with the following structure:
{
  "suggestions": [
    {
      "type": "image|color|text|shape|pattern|material|furniture|lighting|decor",
      "name": "Item name",
      "description": "Description of the design element",
      "colors": ["#hex1", "#hex2"],
      "materials": ["material1", "material2"],
      "style": "specific style",
      "mood": "mood/feeling",
      "placement": "suggested placement",
      "budgetRange": "low|medium|high"
    }
  ],
  "overallTheme": "Overall design theme",
  "colorPalette": ["#primary", "#secondary", "#accent"],
  "materials": ["primary materials"],
  "furnitureStyle": "furniture style recommendations"
}
		`.trim();
	}

	parseMoodboardResponse(response) {
		try {
			const jsonMatch = response.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				throw new Error('No JSON found in AI response');
			}

			const parsed = JSON.parse(jsonMatch[0]);
			
			if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
				throw new Error('Invalid suggestions array in AI response');
			}

			return {
				suggestions: parsed.suggestions,
				overallTheme: parsed.overallTheme || 'Modern Contemporary',
				colorPalette: parsed.colorPalette || ['#ffffff', '#000000', '#cccccc'],
				materials: parsed.materials || ['wood', 'metal', 'fabric'],
				furnitureStyle: parsed.furnitureStyle || 'Modern'
			};
		} catch (error) {
			logger.error('Error parsing AI moodboard response:', error);
			throw new Error('Failed to parse AI moodboard response');
		}
	}

	async generateProjectDescription(leadData) {
		try {
			const prompt = this.buildProjectDescriptionPrompt(leadData);
			
			const completion = await this.openai.chat.completions.create({
				model: config.OPENAI_MODEL,
				messages: [
					{
						role: 'system',
						content: 'You are an expert interior designer. Create detailed, professional project descriptions based on client requirements and preferences.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				max_tokens: 1000,
				temperature: 0.5
			});

			return completion.choices[0].message.content.trim();
		} catch (error) {
			logger.error('AI Project Description Error:', error);
			throw new Error('Failed to generate AI project description');
		}
	}

	buildProjectDescriptionPrompt(leadData) {
		return `
Create a detailed project description for an interior design project based on the following lead information:

Client: ${leadData.firstName} ${leadData.lastName}
Project Type: ${leadData.projectType}
Project Size: ${leadData.projectSize}
Location: ${leadData.location.city}, ${leadData.location.state}
Budget: ${leadData.budget ? `$${leadData.budget}` : 'Not specified'}
Description: ${leadData.projectDescription}

Please create a professional, detailed project description that includes:
- Project overview and scope
- Key design objectives
- Space requirements and considerations
- Style preferences (if any)
- Special requirements or constraints
- Timeline considerations

Make it engaging and professional for client presentations.
		`.trim();
	}

	async isServiceAvailable() {
		try {
			await this.openai.models.list();
			return true;
		} catch (error) {
			logger.error('OpenAI service unavailable:', error);
			return false;
		}
	}
}

export default new AIService();
