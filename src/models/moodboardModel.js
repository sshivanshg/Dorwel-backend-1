import mongoose from 'mongoose';
import paginate from './plugins/paginatePlugin';
import toJSON from './plugins/toJSONPlugin';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';

const moodboardSchema = mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
			trim: true
		},
		description: {
			type: String,
			trim: true
		},
		project: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'projects',
			required: true
		},
		client: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'clients',
			required: true
		},
		status: {
			type: String,
			enum: ['draft', 'shared', 'approved', 'rejected', 'archived'],
			default: 'draft'
		},
		version: {
			type: Number,
			default: 1
		},
		parentMoodboard: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'moodboards'
		},
		items: [{
			type: {
				type: String,
				required: true,
				enum: ['image', 'color', 'text', 'shape', 'pattern', 'material', 'furniture', 'lighting', 'decor']
			},
			name: {
				type: String,
				required: true,
				trim: true
			},
			description: {
				type: String,
				trim: true
			},
			image: {
				url: {
					type: String,
					required: true
				},
				thumbnail: {
					type: String
				},
				alt: {
					type: String,
					trim: true
				},
				width: {
					type: Number
				},
				height: {
					type: Number
				}
			},
			position: {
				x: {
					type: Number,
					default: 0
				},
				y: {
					type: Number,
					default: 0
				},
				z: {
					type: Number,
					default: 0
				}
			},
			size: {
				width: {
					type: Number,
					default: 200
				},
				height: {
					type: Number,
					default: 200
				}
			},
			rotation: {
				type: Number,
				default: 0,
				min: 0,
				max: 360
			},
			opacity: {
				type: Number,
				default: 1,
				min: 0,
				max: 1
			},
			colors: [{
				hex: {
					type: String,
					required: true
				},
				rgb: {
					r: Number,
					g: Number,
					b: Number
				},
				hsl: {
					h: Number,
					s: Number,
					l: Number
				}
			}],
			metadata: {
				source: {
					type: String,
					trim: true
				},
				url: {
					type: String,
					trim: true
				},
				price: {
					type: Number,
					min: 0
				},
				currency: {
					type: String,
					default: 'USD'
				},
				vendor: {
					type: String,
					trim: true
				},
				sku: {
					type: String,
					trim: true
				},
				availability: {
					type: String,
					enum: ['in_stock', 'out_of_stock', 'discontinued', 'unknown'],
					default: 'unknown'
				}
			},
			tags: [{
				type: String,
				trim: true
			}],
			createdBy: {
				type: mongoose.SchemaTypes.ObjectId,
				ref: 'users',
				required: true
			},
			createdAt: {
				type: Date,
				default: Date.now
			}
		}],
		layout: {
			width: {
				type: Number,
				default: 1200
			},
			height: {
				type: Number,
				default: 800
			},
			background: {
				type: {
					type: String,
					enum: ['color', 'image', 'gradient'],
					default: 'color'
				},
				color: {
					type: String,
					default: '#ffffff'
				},
				image: {
					url: String,
					opacity: {
						type: Number,
						default: 1,
						min: 0,
						max: 1
					}
				},
				gradient: {
					colors: [String],
					direction: {
						type: String,
						enum: ['horizontal', 'vertical', 'diagonal'],
						default: 'horizontal'
					}
				}
			},
			grid: {
				enabled: {
					type: Boolean,
					default: false
				},
				size: {
					type: Number,
					default: 20
				},
				color: {
					type: String,
					default: '#cccccc'
				},
				opacity: {
					type: Number,
					default: 0.5,
					min: 0,
					max: 1
				}
			}
		},
		sharing: {
			isPublic: {
				type: Boolean,
				default: false
			},
			shareToken: {
				type: String,
				unique: true,
				sparse: true
			},
			password: {
				type: String
			},
			expiresAt: {
				type: Date
			},
			allowedUsers: [{
				type: mongoose.SchemaTypes.ObjectId,
				ref: 'users'
			}],
			viewCount: {
				type: Number,
				default: 0
			},
			lastViewedAt: {
				type: Date
			}
		},
		comments: [{
			content: {
				type: String,
				required: true,
				trim: true
			},
			author: {
				type: mongoose.SchemaTypes.ObjectId,
				ref: 'users',
				required: true
			},
			position: {
				x: Number,
				y: Number
			},
			itemId: {
				type: mongoose.SchemaTypes.ObjectId
			},
			replies: [{
				content: {
					type: String,
					required: true,
					trim: true
				},
				author: {
					type: mongoose.SchemaTypes.ObjectId,
					ref: 'users',
					required: true
				},
				createdAt: {
					type: Date,
					default: Date.now
				}
			}],
			createdAt: {
				type: Date,
				default: Date.now
			}
		}],
		createdBy: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'users',
			required: true
		},
		tags: [{
			type: String,
			trim: true
		}],
		settings: {
			allowComments: {
				type: Boolean,
				default: true
			},
			allowDownload: {
				type: Boolean,
				default: true
			},
			allowEdit: {
				type: Boolean,
				default: false
			},
			notifications: {
				onComment: {
					type: Boolean,
					default: true
				},
				onApproval: {
					type: Boolean,
					default: true
				}
			}
		}
	},
	{
		timestamps: true,
		toJSON: { virtuals: true }
	}
);

moodboardSchema.plugin(toJSON);
moodboardSchema.plugin(paginate);

moodboardSchema.virtual('isExpired').get(function () {
	if (!this.sharing.expiresAt) return false;
	return new Date() > this.sharing.expiresAt;
});

moodboardSchema.virtual('totalItems').get(function () {
	return this.items.length;
});

moodboardSchema.virtual('totalComments').get(function () {
	return this.comments.length + this.comments.reduce((sum, comment) => sum + comment.replies.length, 0);
});

class MoodboardClass {
	static async getMoodboardById(id) {
		return await this.findById(id)
			.populate('project', 'name description status')
			.populate('client', 'firstName lastName email phone company')
			.populate('createdBy', 'firstName lastName email avatar')
			.populate('items.createdBy', 'firstName lastName email avatar')
			.populate('comments.author', 'firstName lastName email avatar')
			.populate('comments.replies.author', 'firstName lastName email avatar');
	}

	static async getMoodboardsByProject(projectId) {
		return await this.find({ project: projectId })
			.populate('client', 'firstName lastName email phone company')
			.populate('createdBy', 'firstName lastName email avatar')
			.sort({ createdAt: -1 });
	}

	static async getMoodboardsByClient(clientId) {
		return await this.find({ client: clientId })
			.populate('project', 'name description status')
			.populate('createdBy', 'firstName lastName email avatar')
			.sort({ createdAt: -1 });
	}

	static async getMoodboardsByCreator(userId) {
		return await this.find({ createdBy: userId })
			.populate('project', 'name description status')
			.populate('client', 'firstName lastName email phone company')
			.sort({ createdAt: -1 });
	}

	static async getMoodboardsByStatus(status) {
		return await this.find({ status })
			.populate('project', 'name description status')
			.populate('client', 'firstName lastName email phone company')
			.populate('createdBy', 'firstName lastName email avatar');
	}

	static async searchMoodboards(query) {
		const searchRegex = new RegExp(query, 'i');
		return await this.find({
			$or: [
				{ title: searchRegex },
				{ description: searchRegex },
				{ 'items.name': searchRegex },
				{ 'items.description': searchRegex },
				{ tags: { $in: [searchRegex] } }
			]
		})
			.populate('project', 'name description status')
			.populate('client', 'firstName lastName email phone company')
			.populate('createdBy', 'firstName lastName email avatar');
	}

	static async updateMoodboardStatus(moodboardId, status, userId) {
		const moodboard = await this.findById(moodboardId);
		if (!moodboard) {
			throw new APIError('Moodboard not found', httpStatus.NOT_FOUND);
		}

		moodboard.status = status;

		// Add status change comment
		moodboard.comments.push({
			content: `Status changed to ${status}`,
			author: userId
		});

		return await moodboard.save();
	}

	static async addItem(moodboardId, itemData, userId) {
		const moodboard = await this.findById(moodboardId);
		if (!moodboard) {
			throw new APIError('Moodboard not found', httpStatus.NOT_FOUND);
		}

		moodboard.items.push({
			...itemData,
			createdBy: userId
		});

		return await moodboard.save();
	}

	static async updateItem(moodboardId, itemId, updateData, userId) {
		const moodboard = await this.findById(moodboardId);
		if (!moodboard) {
			throw new APIError('Moodboard not found', httpStatus.NOT_FOUND);
		}

		const item = moodboard.items.id(itemId);
		if (!item) {
			throw new APIError('Item not found', httpStatus.NOT_FOUND);
		}

		Object.assign(item, updateData);

		return await moodboard.save();
	}

	static async removeItem(moodboardId, itemId, userId) {
		const moodboard = await this.findById(moodboardId);
		if (!moodboard) {
			throw new APIError('Moodboard not found', httpStatus.NOT_FOUND);
		}

		moodboard.items.pull(itemId);

		return await moodboard.save();
	}

	static async addComment(moodboardId, commentData, userId) {
		const moodboard = await this.findById(moodboardId);
		if (!moodboard) {
			throw new APIError('Moodboard not found', httpStatus.NOT_FOUND);
		}

		moodboard.comments.push({
			...commentData,
			author: userId
		});

		return await moodboard.save();
	}

	static async addReply(moodboardId, commentId, replyData, userId) {
		const moodboard = await this.findById(moodboardId);
		if (!moodboard) {
			throw new APIError('Moodboard not found', httpStatus.NOT_FOUND);
		}

		const comment = moodboard.comments.id(commentId);
		if (!comment) {
			throw new APIError('Comment not found', httpStatus.NOT_FOUND);
		}

		comment.replies.push({
			...replyData,
			author: userId
		});

		return await moodboard.save();
	}

	static async generateShareToken(moodboardId, options = {}) {
		const moodboard = await this.findById(moodboardId);
		if (!moodboard) {
			throw new APIError('Moodboard not found', httpStatus.NOT_FOUND);
		}

		const shareToken = require('crypto').randomBytes(32).toString('hex');
		
		moodboard.sharing.shareToken = shareToken;
		moodboard.sharing.isPublic = options.isPublic || false;
		moodboard.sharing.password = options.password || null;
		moodboard.sharing.expiresAt = options.expiresAt || null;

		return await moodboard.save();
	}

	static async getMoodboardByShareToken(shareToken) {
		return await this.findOne({ 'sharing.shareToken': shareToken })
			.populate('project', 'name description status')
			.populate('client', 'firstName lastName email phone company')
			.populate('createdBy', 'firstName lastName email avatar')
			.populate('items.createdBy', 'firstName lastName email avatar')
			.populate('comments.author', 'firstName lastName email avatar')
			.populate('comments.replies.author', 'firstName lastName email avatar');
	}

	static async incrementViewCount(moodboardId) {
		const moodboard = await this.findById(moodboardId);
		if (!moodboard) {
			throw new APIError('Moodboard not found', httpStatus.NOT_FOUND);
		}

		moodboard.sharing.viewCount += 1;
		moodboard.sharing.lastViewedAt = new Date();

		return await moodboard.save();
	}

	static async getMoodboardStats() {
		const stats = await this.aggregate([
			{
				$group: {
					_id: '$status',
					count: { $sum: 1 }
				}
			}
		]);

		const totalMoodboards = await this.countDocuments();
		const approvedMoodboards = await this.countDocuments({ status: 'approved' });
		const totalViews = await this.aggregate([
			{ $group: { _id: null, total: { $sum: '$sharing.viewCount' } } }
		]);

		return {
			byStatus: stats,
			totalMoodboards,
			approvedMoodboards,
			approvalRate: totalMoodboards > 0 ? (approvedMoodboards / totalMoodboards) * 100 : 0,
			totalViews: totalViews[0]?.total || 0
		};
	}
}

moodboardSchema.loadClass(MoodboardClass);

const Moodboard = mongoose.model('moodboards', moodboardSchema);

export default Moodboard;
