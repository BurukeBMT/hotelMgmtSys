const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/../.env' });

async function addAddressColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hotel_management'
  });

  try {
    console.log('🔧 Checking users table for address column...');

    const [rows] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'address'`,
      [process.env.DB_NAME || 'hotel_management']
    );

    if (rows.length > 0) {
      console.log('ℹ️ Column `address` already exists on `users` table. No action taken.');
    } else {
      console.log('🛠️ Adding `address` column to `users` table...');
      await connection.execute(`ALTER TABLE users ADD COLUMN address TEXT NULL AFTER phone`);
      console.log('✅ `address` column added successfully.');
    }
  } catch (err) {
    console.error('❌ Error running migration:', err.message || err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  addAddressColumn();
}

module.exports = { addAddressColumn };
