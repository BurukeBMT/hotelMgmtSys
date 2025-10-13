const mysql = require('mysql2/promise');
const { logger } = require('../middleware/logger');
require('dotenv').config({ path: __dirname + '/../.env' });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'hotel_management',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test the connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('✅ Connected to MySQL database successfully', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user
    });
    connection.release();
  } catch (err) {
    logger.error('❌ Error connecting to MySQL database:', {
      error: err.message,
      code: err.code,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database
    });
    process.exit(1);
  }
};

// Initialize connection test
testConnection();

// Enhanced query function with better error handling
const query = async (text, params = []) => {
  try {
    const [rows] = await pool.execute(text, params);
    return { rows: rows, rowCount: rows.length };
  } catch (error) {
    logger.error('Database query error:', {
      query: text,
      params: params,
      error: error.message,
      code: error.code
    });
    throw error;
  }
};

// Transaction helper
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Health check function
const healthCheck = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Closing database connections...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Closing database connections...');
  await pool.end();
  process.exit(0);
});

module.exports = {
  query,
  transaction,
  healthCheck,
  pool
};