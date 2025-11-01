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
    // Translate Postgres-style placeholders ($1, $2, ...) to MySQL-style (?)
    let sql = text;
    const hasDollarPlaceholders = /\$[0-9]+/.test(sql);
    if (hasDollarPlaceholders) {
      sql = sql.replace(/\$[0-9]+/g, '?');
    }

    // Detect RETURNING clause (Postgres). We'll emulate common cases for INSERT/UPDATE.
    const returningMatch = sql.match(/\sRETURNING\s+(.+)$/i);
    let returningCols = null;
    if (returningMatch) {
      returningCols = returningMatch[1].trim();
      // strip RETURNING from SQL
      sql = sql.replace(/\sRETURNING\s+(.+)$/i, '');
    }

    const [result] = await pool.execute(sql, params);

    // If there was a RETURNING clause, try to fetch the created/updated row(s)
    if (returningCols) {
      const cleaned = text.trim().toUpperCase();
      // Handle INSERT ... RETURNING *
      if (cleaned.startsWith('INSERT')) {
        const insertId = result && result.insertId;
        if (insertId) {
          // try to extract table name
          const tblMatch = text.match(/INSERT\s+INTO\s+`?(\w+)`?/i);
          const table = tblMatch ? tblMatch[1] : null;
          if (table) {
            const selectSql = `SELECT ${returningCols} FROM ${table} WHERE id = ?`;
            const [rows] = await pool.execute(selectSql, [insertId]);
            return { rows, rowCount: rows.length };
          }
        }
      }

      // Handle UPDATE ... RETURNING * (heuristic: use last param as id)
      if (cleaned.startsWith('UPDATE')) {
        const tblMatch = text.match(/UPDATE\s+`?(\w+)`?/i);
        const table = tblMatch ? tblMatch[1] : null;
        if (table && params && params.length > 0) {
          const idCandidate = params[params.length - 1];
          const selectSql = `SELECT ${returningCols} FROM ${table} WHERE id = ?`;
          try {
            const [rows] = await pool.execute(selectSql, [idCandidate]);
            return { rows, rowCount: rows.length };
          } catch (e) {
            // fall through to return generic result
          }
        }
      }

      // Fallback: return empty rows if we couldn't emulate
      return { rows: [], rowCount: 0 };
    }

    // Normal path: if result is an array of rows (SELECT), return them
    if (Array.isArray(result)) {
      return { rows: result, rowCount: result.length };
    }

    // For non-select queries (INSERT/UPDATE/DELETE), return the OkPacket as rows for callers that expect insertId
    return { rows: result, rowCount: 0 };
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