const express = require('express');
const Inquiry = require('../models/Inquiry');
const { captchaMiddleware } = require('../utils/captchaService');
const router = express.Router();

/**
 * Public Inquiry Submission Endpoint
 * This endpoint allows unauthenticated users to submit inquiries
 * Requires captcha verification for spam protection
 */
router.post('/submit', captchaMiddleware({
  provider: process.env.CAPTCHA_PROVIDER || 'recaptcha',
  tokenField: 'captchaToken',
  skipInDevelopment: process.env.NODE_ENV === 'development'
}), async (req, res) => {
  try {
    const {
      senderName,
      senderEmail,
      subject,
      message,
      inquiryType = 'general',
      technicalDetails,
      priority = 'medium',
      productIds = []
    } = req.body;

    // Validate required fields
    if (!senderName || !senderEmail || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: senderName, senderEmail, and message are required'
      });
    }

    const inquiryData = {
      senderName,
      senderEmail,
      subject,
      message,
      inquiryType,
      priority,
      productIds: Array.isArray(productIds) ? productIds : []
    };

    // Add technical details if it's a technical inquiry
    if (inquiryType === 'technical' && technicalDetails) {
      inquiryData.technicalDetails = technicalDetails;
    }

    const inquiry = await Inquiry.create(inquiryData);

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully. We will get back to you soon.',
      data: {
        id: inquiry._id,
        message: 'Thank you for your inquiry'
      }
    });
  } catch (error) {
    console.error('Error creating public inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit inquiry',
      error: error.message
    });
  }
});

module.exports = router;