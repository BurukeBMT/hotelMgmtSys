
const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

async function createDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || ''
  });
  try {
    await connection.query('CREATE DATABASE IF NOT EXISTS ??', [process.env.DB_NAME]);
    console.log(`✅ Database "${process.env.DB_NAME}" created or already exists.`);
  } catch (error) {
    console.error('❌ Error creating database:', error);
  } finally {
    await connection.end();
  }
}

createDatabase();
