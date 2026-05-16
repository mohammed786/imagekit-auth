const express = require('express');
const mongoose = require('mongoose');
const Inquiry = require('../models/Inquiry');
const { sendReplyEmail } = require('../utils/emailService');
const { verifyAuth0Token } = require('../middleware/authMiddleware');
const router = express.Router();

// Apply Auth0 verification middleware to all inquiry routes
router.use(verifyAuth0Token);

// Get all inquiries with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      inquiryType,
      isRead,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    // Apply filters
    if (status) filter.status = status;
    if (inquiryType) filter.inquiryType = inquiryType;
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (priority) filter.priority = priority;

    // Search functionality
    if (search) {
      filter.$or = [
        { senderName: { $regex: search, $options: 'i' } },
        { senderEmail: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 1 : -1;
    const sortOptions = { [sortBy]: sortDirection };

    const [inquiries, total] = await Promise.all([
      Inquiry.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-updatedAt'),
      Inquiry.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        inquiries,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inquiries',
      error: error.message
    });
  }
});

// Get inquiry statistics — must be defined before /:id to avoid route conflict
router.get('/stats/summary', async (req, res) => {
  try {
    const [
      totalInquiries,
      openInquiries,
      underProcessedInquiries,
      processedInquiries,
      unreadInquiries,
      technicalInquiries
    ] = await Promise.all([
      Inquiry.countDocuments(),
      Inquiry.countDocuments({ status: 'open' }),
      Inquiry.countDocuments({ status: 'under_processed' }),
      Inquiry.countDocuments({ status: 'processed' }),
      Inquiry.countDocuments({ isRead: false }),
      Inquiry.countDocuments({ inquiryType: 'technical' })
    ]);

    res.json({
      success: true,
      data: {
        total: totalInquiries,
        open: openInquiries,
        underProcessed: underProcessedInquiries,
        processed: processedInquiries,
        unread: unreadInquiries,
        technical: technicalInquiries
      }
    });
  } catch (error) {
    console.error('Error fetching inquiry statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inquiry statistics',
      error: error.message
    });
  }
});

// Get inquiry by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid inquiry ID' });
    }

    const inquiry = await Inquiry.findById(id);

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    res.json({ success: true, data: inquiry });
  } catch (error) {
    console.error('Error fetching inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inquiry',
      error: error.message
    });
  }
});

// Update inquiry status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid inquiry ID' });
    }

    if (!['open', 'under_processed', 'processed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: open, under_processed, or processed'
      });
    }

    const inquiry = await Inquiry.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    res.json({
      success: true,
      message: 'Inquiry status updated successfully',
      data: inquiry
    });
  } catch (error) {
    console.error('Error updating inquiry status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inquiry status',
      error: error.message
    });
  }
});

// Mark inquiry as read/unread
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { isRead } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid inquiry ID' });
    }

    // If isRead not provided, fetch current value to toggle
    let newIsRead = isRead;
    if (newIsRead === undefined) {
      const existing = await Inquiry.findById(id, 'isRead');
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Inquiry not found' });
      }
      newIsRead = !existing.isRead;
    }

    const inquiry = await Inquiry.findByIdAndUpdate(
      id,
      { isRead: newIsRead },
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    res.json({
      success: true,
      message: `Inquiry marked as ${inquiry.isRead ? 'read' : 'unread'}`,
      data: inquiry
    });
  } catch (error) {
    console.error('Error updating inquiry read status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inquiry read status',
      error: error.message
    });
  }
});

// Reply to inquiry
router.post('/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { reply, adminName = 'Admin' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid inquiry ID' });
    }

    if (!reply) {
      return res.status(400).json({ success: false, message: 'Reply message is required' });
    }

    const inquiry = await Inquiry.findByIdAndUpdate(
      id,
      {
        adminReply: reply,
        repliedAt: new Date(),
        repliedBy: adminName,
        status: 'processed',
        isRead: true
      },
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    // Send email reply
    try {
      await sendReplyEmail({
        to: inquiry.senderEmail,
        senderName: inquiry.senderName,
        originalSubject: inquiry.subject,
        originalMessage: inquiry.message,
        reply,
        adminName
      });
    } catch (emailError) {
      console.error('Error sending reply email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: inquiry
    });
  } catch (error) {
    console.error('Error sending reply:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reply',
      error: error.message
    });
  }
});

// Update product availability for technical inquiry
router.patch('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { productAvailability } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid inquiry ID' });
    }

    const inquiry = await Inquiry.findById(id);

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    if (inquiry.inquiryType !== 'technical') {
      return res.status(400).json({
        success: false,
        message: 'Product availability can only be updated for technical inquiries'
      });
    }

    inquiry.productAvailability = productAvailability;
    await inquiry.save();

    res.json({
      success: true,
      message: 'Product availability updated successfully',
      data: inquiry
    });
  } catch (error) {
    console.error('Error updating product availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product availability',
      error: error.message
    });
  }
});

// Delete inquiry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid inquiry ID' });
    }

    const inquiry = await Inquiry.findByIdAndDelete(id);

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    res.json({ success: true, message: 'Inquiry deleted successfully' });
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inquiry',
      error: error.message
    });
  }
});

// Bulk delete inquiries
router.delete('/', async (req, res) => {
  try {
    const { ids, deleteAll = false } = req.body;

    if (deleteAll) {
      const result = await Inquiry.deleteMany({});
      return res.json({
        success: true,
        message: `All inquiries deleted successfully (${result.deletedCount} inquiries)`
      });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provide an array of inquiry IDs or set deleteAll to true'
      });
    }

    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    const result = await Inquiry.deleteMany({ _id: { $in: validIds } });

    res.json({
      success: true,
      message: `${result.deletedCount} inquiries deleted successfully`
    });
  } catch (error) {
    console.error('Error bulk deleting inquiries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inquiries',
      error: error.message
    });
  }
});

module.exports = router;
