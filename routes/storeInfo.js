const express = require('express');
const StoreInfo = require('../models/StoreInfo');
const { verifyAuth0Token } = require('../middleware/authMiddleware');
const router = express.Router();

/**
 * Public Store Info Endpoint
 * Returns the store contact information for display on the website
 */
router.get('/', async (req, res) => {
  try {
    let storeInfo = await StoreInfo.findOne();

    // If no store info exists, create default
    if (!storeInfo) {
      storeInfo = await StoreInfo.create({
        storeName: 'A To Z Hardware Agency',
        phone: '098494 01709',
        email: 'enquiry.atozhardware@hotmail.com',
        address: {
          street: '7, 2-630, Rashtrapati Rd, Hissamganj',
          locality: 'Monda Market, Takara Basthi',
          city: 'Secunderabad',
          state: 'Telangana',
          pincode: '500003',
          country: 'India'
        },
        businessHours: {
          weekdays: 'Monday - Saturday: 9:30 AM - 8:30 PM',
          weekends: 'Sunday: Closed'
        },
        googleMapsUrl: ''
      });
    }

    res.json({
      success: true,
      data: storeInfo
    });
  } catch (error) {
    console.error('Error fetching store info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch store info',
      error: error.message
    });
  }
});

/**
 * Protected Store Info Update Endpoint
 * Allows admin to update store contact information
 */
router.put('/', verifyAuth0Token, async (req, res) => {
  try {
    const {
      storeName,
      phone,
      email,
      address,
      businessHours,
      googleMapsUrl
    } = req.body;

    let storeInfo = await StoreInfo.findOne();

    if (!storeInfo) {
      // Create new if doesn't exist
      storeInfo = await StoreInfo.create({
        storeName,
        phone,
        email,
        address,
        businessHours,
        googleMapsUrl
      });
    } else {
      // Update existing
      storeInfo = await StoreInfo.findByIdAndUpdate(
        storeInfo._id,
        {
          storeName,
          phone,
          email,
          address,
          businessHours,
          googleMapsUrl
        },
        { new: true, runValidators: true }
      );
    }

    res.json({
      success: true,
      message: 'Store info updated successfully',
      data: storeInfo
    });
  } catch (error) {
    console.error('Error updating store info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update store info',
      error: error.message
    });
  }
});

module.exports = router;
