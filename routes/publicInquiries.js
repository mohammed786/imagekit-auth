const express = require('express');
const Inquiry = require('../models/Inquiry');
const { captchaMiddleware } = require('../utils/captchaService');
const { default: axios } = require('axios');
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
      senderPhone,
      subject,
      message,
      inquiryType = 'general',
      technicalDetails,
      priority = 'medium',
      products = []
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
      senderPhone: senderPhone || null,
      subject,
      message,
      inquiryType,
      priority,
      products: Array.isArray(products) ? products : []
    };

    // Add technical details if it's a technical inquiry
    if (inquiryType === 'technical' && technicalDetails) {
      inquiryData.technicalDetails = technicalDetails;
    }

    const inquiry = await Inquiry.create(inquiryData);

    const productRows = products.length > 0
      ? products.map(p => `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; vertical-align: top;">
              <strong style="font-size: 14px;">${p.productName || 'N/A'}</strong><br/>
              <span style="color: #555; font-size: 12px;">Code: ${p.productCode || 'N/A'}</span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; vertical-align: top; text-align: center;">
              <span style="
                display: inline-block;
                background-color: #f0e6ff;
                color: #7c3aed;
                border: 1px solid #d8b4fe;
                border-radius: 4px;
                padding: 2px 10px;
                font-size: 13px;
                font-weight: 600;
              ">${p.quantity}</span>
            </td>
          </tr>`).join('')
      : `<tr><td colspan="2" style="padding: 12px; color: #999; text-align: center;">No products listed</td></tr>`;

    const productTextLines = products.length > 0
      ? products.map(p => `  - ${p.productName || 'N/A'} | Code: ${p.productCode || 'N/A'} | Qty: ${p.quantity}`).join('\n')
      : '  None';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">

        <!-- Header -->
        <div style="background-color: #007bff; padding: 20px 24px;">
          <h2 style="margin: 0; color: #ffffff; font-size: 20px;">New Store Inquiry</h2>
          <p style="margin: 4px 0 0; color: #cce5ff; font-size: 13px;">Submitted via AtoZ Hardware website</p>
        </div>

        <!-- Summary badges -->
        <div style="padding: 16px 24px; background-color: #f8f9fa; border-bottom: 1px solid #e0e0e0;">
          <span style="display:inline-block; margin-right:8px; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #d1ecf1; color: #0c5460;">
            ${inquiryType.toUpperCase()}
          </span>
          <span style="display:inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;
            background-color: ${priority === 'high' ? '#f8d7da' : priority === 'low' ? '#d4edda' : '#fff3cd'};
            color: ${priority === 'high' ? '#721c24' : priority === 'low' ? '#155724' : '#856404'};">
            ${priority.toUpperCase()} PRIORITY
          </span>
        </div>

        <!-- Sender details table -->
        <div style="padding: 20px 24px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr>
                <th colspan="2" style="text-align: left; padding: 8px 12px; background-color: #f0f4ff; font-size: 13px; color: #374151; border-radius: 4px 4px 0 0;">
                  Customer Details
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 10px 12px; border-bottom: 1px solid #eee; color: #6b7280; font-size: 13px; width: 35%;">Name</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; font-weight: 600;">${senderName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; border-bottom: 1px solid #eee; color: #6b7280; font-size: 13px;">Email</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px;">
                  <a href="mailto:${senderEmail}" style="color: #007bff; text-decoration: none;">${senderEmail}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; border-bottom: 1px solid #eee; color: #6b7280; font-size: 13px;">Phone</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px;">
                  ${senderPhone ? `<a href="tel:${senderPhone}" style="color: #007bff; text-decoration: none;">${senderPhone}</a>` : '—'}
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; border-bottom: 1px solid #eee; color: #6b7280; font-size: 13px;">Subject</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px;">${subject || '—'}</td>
              </tr>
            </tbody>
          </table>

          <!-- Message -->
          <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Message</p>
            <div style="background-color: #f9f9f9; padding: 14px 16px; border-left: 4px solid #007bff; border-radius: 0 4px 4px 0; font-size: 14px; font-style: italic; color: #374151;">
              "${message}"
            </div>
          </div>

          ${technicalDetails ? `
          <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Technical Details</p>
            <div style="background-color: #fff8e1; padding: 14px 16px; border-left: 4px solid #ffc107; border-radius: 0 4px 4px 0; font-size: 14px; color: #374151;">
              ${technicalDetails}
            </div>
          </div>` : ''}

          <!-- Products table -->
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
            Products Requested (${products.length})
          </p>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden;">
            <thead>
              <tr style="background-color: #f0f4ff;">
                <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #374151; border-bottom: 1px solid #e0e0e0;">Product</th>
                <th style="padding: 10px 12px; text-align: center; font-size: 13px; color: #374151; border-bottom: 1px solid #e0e0e0; width: 80px;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${productRows}
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div style="padding: 14px 24px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            Reply directly to this email to respond to the customer — Reply-To is set to <strong>${senderEmail}</strong>
          </p>
        </div>
      </div>
    `;

    const text_body = `New Store Inquiry
==================
Type: ${inquiryType.toUpperCase()} | Priority: ${priority.toUpperCase()}

CUSTOMER DETAILS
----------------
Name:    ${senderName}
Email:   ${senderEmail}
Phone:   ${senderPhone || '—'}
Subject: ${subject || '—'}

MESSAGE
-------
${message}
${technicalDetails ? `\nTECHNICAL DETAILS\n-----------------\n${technicalDetails}\n` : ''}
PRODUCTS REQUESTED (${products.length})
-----------------------
${productTextLines}

--
Reply-To: ${senderEmail}
`;

    // 3. Prepare the SMTP2GO Payload
    const emailPayload = {
      api_key: process.env.SMTP2GO_API_KEY,
      sender: `AtoZ Hardware Alerts <alerts@atozhardware.in>`,
      to: ['enquiry.atozhardware@hotmail.com'],
      // to: ['mohammedmodi@gmail.com'],
      // Reply-To set to the customer's email for one-click replies
      custom_headers: [
        {
          header: "Reply-To",
          value: senderEmail
        }
      ],
      subject: `[${priority.toUpperCase()}] New Inquiry: ${subject}`,
      // Plain text body — essential for spam filter scoring
      text_body,
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