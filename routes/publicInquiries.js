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

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
        <h2 style="color: #007bff; border-bottom: 2px solid #eee; padding-bottom: 10px;">New Store Inquiry</h2>
        <p><strong>Type:</strong> ${inquiryType.toUpperCase()} | <strong>Priority:</strong> ${priority.toUpperCase()}</p>
        <p><strong>Customer Name:</strong> ${senderName}</p>
        <p><strong>Customer Email:</strong> ${senderEmail}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #007bff; margin: 15px 0;">
          <p style="margin: 0; font-style: italic;">"${message}"</p>
        </div>

        ${technicalDetails ? `<p><strong>Technical Details:</strong> ${technicalDetails}</p>` : ''}
        <p><strong>Product IDs Mentioned:</strong> ${productIds.length > 0 ? productIds.join(', ') : 'None'}</p>
      </div>
    `;

    // 3. Prepare the SMTP2GO Payload
    const emailPayload = {
      api_key: process.env.SMTP2GO_API_KEY,
      sender: `AtoZ Hardware Alerts <${process.env.SMTP2GO_SENDER_EMAIL}>`,
      to: ['enquiry.atozhardware@hotmail.com'],
      // We inject custom_headers to set the 'Reply-To' to the customer's email
      custom_headers: [
        {
          header: "Reply-To",
          value: senderEmail
        }
      ],
      subject: `[${priority.toUpperCase()}] New Inquiry: ${subject}`,
      html_body: emailHtml
    };

    // 4. Send the HTTP request to the SMTP2GO API (Asynchronous Background Task)
    axios.post('https://api.smtp2go.com/v3/email/send', emailPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    .then((response) => {
      console.log('Email successfully sent via Axios. Response:', response.data);
    })
    .catch((error) => {
      // Catching SMTP2GO specific API errors or network drops cleanly
      if (error.response) {
        console.error('SMTP2GO API Error Details:', error.response.data);
      } else {
        console.error('Network Error connecting to SMTP2GO:', error.message);
      }
    });

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