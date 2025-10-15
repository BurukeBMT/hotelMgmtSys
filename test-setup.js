#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🏨 Hotel Management System MVP - Setup Test');
console.log('==========================================\n');

// Test 1: Check if all required files exist
console.log('📁 Checking required files...');
const requiredFiles = [
  'server/package.json',
  'client/package.json',
  'server/index.js',
  'server/database/config.js',
  'server/database/schema.sql',
  'server/database/setup.js',
  'config.env',
  'client/src/App.js',
  'client/src/pages/HR.js',
  'client/src/pages/Dashboard.js',
  'MVP_SETUP_GUIDE.md'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

console.log(`\n📋 File check: ${allFilesExist ? 'PASSED' : 'FAILED'}\n`);

// Test 2: Check package.json dependencies
console.log('📦 Checking dependencies...');
try {
  const serverPkg = JSON.parse(fs.readFileSync('server/package.json', 'utf8'));
  const clientPkg = JSON.parse(fs.readFileSync('client/package.json', 'utf8'));
  
  const requiredServerDeps = ['express', 'mysql2', 'jsonwebtoken', 'bcryptjs'];
  const requiredClientDeps = ['react', 'react-router-dom', 'axios', 'react-hot-toast'];
  
  let serverDepsOk = true;
  let clientDepsOk = true;
  
  requiredServerDeps.forEach(dep => {
    if (serverPkg.dependencies[dep]) {
      console.log(`✅ Server: ${dep} (${serverPkg.dependencies[dep]})`);
    } else {
      console.log(`❌ Server: ${dep} - MISSING`);
      serverDepsOk = false;
    }
  });
  
  requiredClientDeps.forEach(dep => {
    if (clientPkg.dependencies[dep]) {
      console.log(`✅ Client: ${dep} (${clientPkg.dependencies[dep]})`);
    } else {
      console.log(`❌ Client: ${dep} - MISSING`);
      clientDepsOk = false;
    }
  });
  
  console.log(`\n📦 Dependencies check: ${serverDepsOk && clientDepsOk ? 'PASSED' : 'FAILED'}\n`);
} catch (error) {
  console.log(`❌ Error reading package.json files: ${error.message}\n`);
}

// Test 3: Check configuration
console.log('⚙️ Checking configuration...');
try {
  const configEnv = fs.readFileSync('config.env', 'utf8');
  const requiredConfigs = ['PORT', 'DB_HOST', 'DB_NAME', 'JWT_SECRET'];
  
  let configOk = true;
  requiredConfigs.forEach(config => {
    if (configEnv.includes(config)) {
      console.log(`✅ ${config}`);
    } else {
      console.log(`❌ ${config} - MISSING`);
      configOk = false;
    }
  });
  
  console.log(`\n⚙️ Configuration check: ${configOk ? 'PASSED' : 'FAILED'}\n`);
} catch (error) {
  console.log(`❌ Error reading config.env: ${error.message}\n`);
}

// Test 4: Check database schema
console.log('🗄️ Checking database schema...');
try {
  const schema = fs.readFileSync('server/database/schema.sql', 'utf8');
  const requiredTables = ['users', 'departments', 'employees', 'rooms', 'bookings', 'guests', 'payments', 'attendance', 'payroll'];
  
  let schemaOk = true;
  requiredTables.forEach(table => {
    if (schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
      console.log(`✅ Table: ${table}`);
    } else {
      console.log(`❌ Table: ${table} - MISSING`);
      schemaOk = false;
    }
  });
  
  console.log(`\n🗄️ Schema check: ${schemaOk ? 'PASSED' : 'FAILED'}\n`);
} catch (error) {
  console.log(`❌ Error reading schema.sql: ${error.message}\n`);
}

// Test 5: Check API routes
console.log('🔗 Checking API routes...');
try {
  const serverIndex = fs.readFileSync('server/index.js', 'utf8');
  const requiredRoutes = ['/api/auth', '/api/hr', '/api/bookings', '/api/rooms', '/api/guests', '/api/payments', '/api/attendance', '/api/payroll'];
  
  let routesOk = true;
  requiredRoutes.forEach(route => {
    if (serverIndex.includes(`app.use('${route}'`)) {
      console.log(`✅ Route: ${route}`);
    } else {
      console.log(`❌ Route: ${route} - MISSING`);
      routesOk = false;
    }
  });
  
  console.log(`\n🔗 Routes check: ${routesOk ? 'PASSED' : 'FAILED'}\n`);
} catch (error) {
  console.log(`❌ Error reading server/index.js: ${error.message}\n`);
}

// Test 6: Check frontend components
console.log('🎨 Checking frontend components...');
try {
  const hrComponent = fs.readFileSync('client/src/pages/HR.js', 'utf8');
  const dashboardComponent = fs.readFileSync('client/src/pages/Dashboard.js', 'utf8');
  
  const requiredFeatures = [
    'useState',
    'useEffect',
    'api.get',
    'toast',
    'employees',
    'attendance',
    'payroll'
  ];
  
  let frontendOk = true;
  requiredFeatures.forEach(feature => {
    if (hrComponent.includes(feature) || dashboardComponent.includes(feature)) {
      console.log(`✅ Feature: ${feature}`);
    } else {
      console.log(`❌ Feature: ${feature} - MISSING`);
      frontendOk = false;
    }
  });
  
  console.log(`\n🎨 Frontend check: ${frontendOk ? 'PASSED' : 'FAILED'}\n`);
} catch (error) {
  console.log(`❌ Error reading frontend components: ${error.message}\n`);
}

console.log('🎯 MVP Setup Test Complete!');
console.log('============================');
console.log('\n📋 Next Steps:');
console.log('1. Start MySQL database (XAMPP or local MySQL)');
console.log('2. Run: npm run dev (to start both servers)');
console.log('3. Open http://localhost:3000 in your browser');
console.log('4. Login with: admin / admin123');
console.log('\n📖 For detailed setup instructions, see MVP_SETUP_GUIDE.md');
console.log('\n🏨 Happy Hotel Managing! ✨');



