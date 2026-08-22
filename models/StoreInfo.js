const mongoose = require('mongoose');

const StoreInfoSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      required: true,
      trim: true,
      default: 'A To Z Hardware Agency'
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    address: {
      street: { type: String, trim: true, default: '' },
      locality: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      pincode: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: 'India' }
    },
    businessHours: {
      weekdays: { type: String, trim: true, default: '' },
      weekends: { type: String, trim: true, default: '' }
    },
    googleMapsUrl: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    collection: 'storeInfo',
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true
    }
  }
);

const StoreInfo = mongoose.model('StoreInfo', StoreInfoSchema);

module.exports = StoreInfo;
