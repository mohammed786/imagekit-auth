const mongoose = require('mongoose');

const InquirySchema = new mongoose.Schema(
  {
    senderName: {
      type: String,
      required: true,
      trim: true
    },
    senderEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    subject: {
      type: String,
      default: null
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    inquiryType: {
      type: String,
      enum: ['general', 'technical'],
      default: 'general'
    },
    status: {
      type: String,
      enum: ['open', 'under_processed', 'processed'],
      default: 'open'
    },
    technicalDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      comment: 'Technical specifications and product requirements'
    },
    productAvailability: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      comment: 'Product availability based on technical specs'
    },
    adminReply: {
      type: String,
      default: null
    },
    repliedAt: {
      type: Date,
      default: null
    },
    repliedBy: {
      type: String,
      default: null
    },
    isRead: {
      type: Boolean,
      default: false
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    products: {
      type: [
        {
          id: { type: mongoose.Schema.Types.Mixed, required: true },
          productName: { type: String, default: null },
          productCode: { type: String, default: null },
          quantity: { type: Number, required: true, min: 1, default: 1 }
        }
      ],
      default: [],
      comment: 'Array of products with id, name, code and quantity selected by the user'
    }
  },
  {
    collection: 'inquires', // collection name as specified
    timestamps: true,       // adds createdAt and updatedAt automatically
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true
    }
  }
);

// Indexes
InquirySchema.index({ status: 1 });
InquirySchema.index({ inquiryType: 1 });
InquirySchema.index({ createdAt: -1 });
InquirySchema.index({ senderEmail: 1 });

const Inquiry = mongoose.model('Inquiry', InquirySchema);

module.exports = Inquiry;
