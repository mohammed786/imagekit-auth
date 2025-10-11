const { Sequelize } = require('sequelize');
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test the connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("Successfully connected to the database.");
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
}

async function getAllTables() {
  try {
    const [results] = await sequelize.query('SHOW TABLES');
    return results.map(row => Object.values(row)[0]);
  } catch (error) {
    console.error("Error getting tables:", error);
    throw error;
  }
}

async function getTableData(tableName) {
  try {
    // Use raw: false to get Sequelize model instances
    const [results] = await sequelize.query(`SELECT * FROM ${tableName}`, {
      raw: false,
      nest: true,
      type: sequelize.QueryTypes.SELECT
    });
    
    // Convert the results to plain JSON objects
    return JSON.parse(JSON.stringify(results));
  } catch (error) {
    console.error("Error getting table data:", error);
    throw error;
  }
}

module.exports = {
  sequelize,
  getAllTables,
  getTableData,
};
