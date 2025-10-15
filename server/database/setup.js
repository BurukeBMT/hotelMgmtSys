const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

const createDatabase = async () => {
  try {
    console.log('🗄️ Setting up MySQL database...');

    // Connect to MySQL without specifying database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'abenu',
      password: process.env.DB_PASSWORD || '1234567890'
    });

    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'hotel_management'}`);
    console.log('✅ Database created/verified successfully');

    await connection.end();

    // Now connect to the specific database
    const dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME || 'hotel_management',
      user: process.env.DB_USER || 'abenu',
      password: process.env.DB_PASSWORD || '1234567890'
    });

    // Read and execute schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log('📋 Executing database schema...');
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await dbConnection.execute(statement);
        } catch (error) {
          // Skip errors for duplicate entries or existing objects
          if (!error.message.includes('already exists') && 
              !error.message.includes('Duplicate entry') &&
              !error.message.includes('Table') && 
              !error.message.includes('already exists')) {
            console.warn(`⚠️ Warning executing statement: ${error.message}`);
          }
        }
      }
    }

    await dbConnection.end();
    console.log('✅ Database setup completed successfully!');
    
    // Insert additional default data
    await insertDefaultData();

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
};

const insertDefaultData = async () => {
  try {
    const { query } = require('./config');
    
    console.log('📊 Inserting default data...');

    // Insert default admin user if not exists
    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    await query(`
      INSERT IGNORE INTO users (username, email, password_hash, role, first_name, last_name) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['admin', 'admin@hotel.com', adminPassword, 'admin', 'Admin', 'User']);

    // Insert sample employees
    await query(`
      INSERT IGNORE INTO employees (employee_id, first_name, last_name, email, phone, department_id, position, salary, hire_date) VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'EMP001', 'John', 'Doe', 'john.doe@hotel.com', '+1234567890', 1, 'Housekeeping Supervisor', 2500.00, '2023-01-15',
      'EMP002', 'Jane', 'Smith', 'jane.smith@hotel.com', '+1234567891', 2, 'Receptionist', 2000.00, '2023-02-01',
      'EMP003', 'Mike', 'Johnson', 'mike.johnson@hotel.com', '+1234567892', 3, 'Chef', 3000.00, '2023-01-01'
    ]);

    // Insert sample guests
    await query(`
      INSERT IGNORE INTO guests (first_name, last_name, email, phone, address, id_type, id_number, nationality) VALUES
      (?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Alice', 'Brown', 'alice.brown@email.com', '+1234567893', '123 Main St, City', 'passport', 'P123456789', 'American',
      'Bob', 'Wilson', 'bob.wilson@email.com', '+1234567894', '456 Oak Ave, City', 'national_id', 'ID987654321', 'Canadian'
    ]);

    // Insert sample bookings
    await query(`
      INSERT IGNORE INTO bookings (booking_number, guest_id, room_id, check_in_date, check_out_date, adults, children, total_amount, status) VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'BK001', 1, 1, '2024-01-15', '2024-01-17', 2, 0, 160.00, 'confirmed',
      'BK002', 2, 3, '2024-01-20', '2024-01-22', 1, 1, 240.00, 'pending'
    ]);

    // Insert sample payments
    await query(`
      INSERT IGNORE INTO payments (booking_id, amount, payment_method, status, transaction_id) VALUES
      (?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?)
    `, [
      1, 160.00, 'card', 'completed', 'TXN001',
      2, 120.00, 'cash', 'completed', 'TXN002'
    ]);

    // Insert sample attendance records
    await query(`
      INSERT IGNORE INTO attendance (employee_id, date, check_in_time, check_out_time, status) VALUES
      (?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?)
    `, [
      1, '2024-01-15', '08:00:00', '17:00:00', 'present',
      2, '2024-01-15', '09:00:00', '18:00:00', 'present',
      3, '2024-01-15', '07:30:00', '16:30:00', 'present'
    ]);

    // Insert sample payroll records
    await query(`
      INSERT IGNORE INTO payroll (employee_id, month, year, base_salary, days_worked, net_salary, status) VALUES
      (?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?)
    `, [
      1, 1, 2024, 2500.00, 22, 2500.00, 'paid',
      2, 1, 2024, 2000.00, 20, 2000.00, 'paid',
      3, 1, 2024, 3000.00, 23, 3000.00, 'paid'
    ]);

    console.log('✅ Default data inserted successfully!');
  } catch (error) {
    console.error('❌ Error inserting default data:', error);
  }
};

if (require.main === module) {
  createDatabase();
}

module.exports = { createDatabase };