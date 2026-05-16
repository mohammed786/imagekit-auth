const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send reply email to customer
const sendReplyEmail = async ({ to, senderName, originalSubject, originalMessage, reply, adminName }) => {
  try {
    const transporter = createTransporter();

    const subject = `Re: ${originalSubject || 'Your Inquiry'}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Thank you for your inquiry</h2>
        
        <p>Dear ${senderName},</p>
        
        <p>Thank you for contacting us. We have reviewed your inquiry and here is our response:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #333;">Our Response:</h4>
          <p style="white-space: pre-wrap;">${reply}</p>
          <p style="margin-bottom: 0;"><strong>- ${adminName}</strong></p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #666;">Your Original Message:</h4>
          <p style="white-space: pre-wrap; color: #666;">${originalMessage}</p>
        </div>
        
        <p>If you have any further questions, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>
        Customer Support Team</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          This is an automated response to your inquiry. Please do not reply directly to this email.
        </p>
      </div>
    `;

    const textContent = `
Dear ${senderName},

Thank you for contacting us. We have reviewed your inquiry and here is our response:

Our Response:
${reply}
- ${adminName}

Your Original Message:
${originalMessage}

If you have any further questions, please don't hesitate to contact us.

Best regards,
Customer Support Team
    `;

    const mailOptions = {
      from: `"Customer Support" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      text: textContent,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Reply email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending reply email:', error);
    throw error;
  }
};

// Send notification email to admin when new inquiry is received
const sendNewInquiryNotification = async (inquiry) => {
  try {
    if (!process.env.ADMIN_EMAIL) {
      console.log('Admin email not configured, skipping notification');
      return;
    }

    const transporter = createTransporter();

    const subject = `New ${inquiry.inquiryType} inquiry from ${inquiry.senderName}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Inquiry Received</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #007bff;">Inquiry Details</h3>
          <p><strong>From:</strong> ${inquiry.senderName} (${inquiry.senderEmail})</p>
          <p><strong>Type:</strong> ${inquiry.inquiryType}</p>
          <p><strong>Priority:</strong> ${inquiry.priority}</p>
          <p><strong>Subject:</strong> ${inquiry.subject || 'No subject'}</p>
          <p><strong>Received:</strong> ${new Date(inquiry.createdAt).toLocaleString()}</p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h4 style="margin-top: 0;">Message:</h4>
          <p style="white-space: pre-wrap;">${inquiry.message}</p>
        </div>
        
        ${inquiry.technicalDetails ? `
        <div style="background-color: #e8f4f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #0056b3;">Technical Details:</h4>
          <pre style="white-space: pre-wrap; font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 3px;">${JSON.stringify(inquiry.technicalDetails, null, 2)}</pre>
        </div>
        ` : ''}
        
        <p style="margin-top: 30px;">
          <a href="${process.env.ADMIN_PANEL_URL || '#'}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View in Admin Panel
          </a>
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"Inquiry System" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Admin notification sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending admin notification:', error);
    throw error;
  }
};

module.exports = {
  sendReplyEmail,
  sendNewInquiryNotification
};