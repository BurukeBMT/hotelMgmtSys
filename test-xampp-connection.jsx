const mysql = require('mysql2/promise');
require('dotenv').config();

async function testXAMPPConnection() {
  console.log('🔍 Testing XAMPP MySQL Connection...');
  console.log('=====================================');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hotel_management'
  };

  console.log('📋 Connection Details:');
  console.log(`Host: ${config.host}`);
  console.log(`Port: ${config.port}`);
  console.log(`User: ${config.user}`);
  console.log(`Database: ${config.database}`);
  console.log(`Password: ${config.password ? '[SET]' : '[EMPTY]'}`);
  console.log('');

  try {
    // Test connection without database first
    console.log('🔌 Testing basic MySQL connection...');
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });

    console.log('✅ Basic MySQL connection successful!');
    
    // Check if database exists
    const [databases] = await connection.query('SHOW DATABASES');
    const dbExists = databases.some(db => db.Database === config.database);
    
    if (dbExists) {
      console.log(`✅ Database '${config.database}' exists!`);
      
      // Test connection with database
      await connection.query(`USE ${config.database}`);
      console.log(`✅ Successfully connected to database '${config.database}'`);
      
      // Check tables
      const [tables] = await connection.query('SHOW TABLES');
      console.log(`📊 Found ${tables.length} tables in the database:`);
      tables.forEach(table => {
        console.log(`   - ${Object.values(table)[0]}`);
      });
      
    } else {
      console.log(`❌ Database '${config.database}' does not exist.`);
      console.log('💡 Run "node server/createDatabase.js" to create it.');
    }

    await connection.end();
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting tips:');
    console.log('1. Make sure XAMPP is running');
    console.log('2. Start MySQL service in XAMPP Control Panel');
    console.log('3. Check if port 3306 is not blocked');
    console.log('4. Verify credentials in config.env');
    console.log('5. Try accessing http://localhost/phpmyadmin');
  }
}

if (require.main === module) {
  testXAMPPConnection();
}

module.exports = { testXAMPPConnection };
