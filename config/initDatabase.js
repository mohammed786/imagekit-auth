const { connectMongoDB } = require('./database');

const initDatabase = async () => {
  try {
    await connectMongoDB();
    console.log('Database initialized successfully.');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

module.exports = { initDatabase };
