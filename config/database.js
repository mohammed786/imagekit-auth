const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_DB_CONNECTIONSTRING;
const DB_NAME = 'inquiry_db';

async function connectMongoDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      dbName: DB_NAME
    });
    console.log(`Successfully connected to MongoDB (${DB_NAME}).`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

module.exports = { connectMongoDB };
