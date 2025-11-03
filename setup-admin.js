/**
 * Server-side setup script using Firebase Admin SDK.
 *
 * This script uses the Admin SDK (service account) so it bypasses Firestore
 * security rules and can seed users and initial data. To run:
 *
 * 1) Create a Firebase service account key JSON in the Firebase Console
 *    and save it as `serviceAccountKey.json` in the project root OR set
 *    the environment variable GOOGLE_APPLICATION_CREDENTIALS to its path.
 *
 * 2) Install dependencies if not already:
 *    npm install firebase-admin
 *
 * 3) Run:
 *    node setup-admin.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Try to load service account from local file first, otherwise rely on ADC
let serviceAccount;
try {
  serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
} catch (e) {
  // If not present, we will attempt to use Application Default Credentials (ADC)
  serviceAccount = null;
}

// If no local key and no env var pointing to credentials, give a clear error and exit
if (!serviceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('\n❌ Firebase Admin credentials not found.');
  console.error('Provide a service account key JSON (recommended) or set Application Default Credentials.');
  console.error('\nOption A (recommended - Firebase Console):');
  console.error('  1. Go to Firebase Console → Project Settings → Service accounts → Generate new private key.');
  console.error('  2. Save the JSON file to your project root as: serviceAccountKey.json');
  console.error('  3. Run: export GOOGLE_APPLICATION_CREDENTIALS="/c/Users/geber/Documents/hotelMgmtSys/serviceAccountKey.json"');
  console.error('\nOption B (gcloud ADC):');
  console.error('  1. Install and authenticate gcloud.');
  console.error('  2. Run: gcloud auth application-default login');
  console.error('\nAfter providing credentials, re-run: node setup-admin.js\n');
  process.exit(1);
}

const initOptions = serviceAccount
  ? { credential: admin.credential.cert(serviceAccount) }
  : { credential: admin.credential.applicationDefault() };

admin.initializeApp(initOptions);
const auth = admin.auth();
const db = admin.firestore();

async function setupAdminAndData() {
  try {
    console.log('🚀 Starting admin and data setup...\n');

    // 1. Create or get Admin User
    console.log('1️⃣ Creating admin user...');
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail('admin@hotel.com');
      console.log('⚠️ Admin user already exists, skipping creation');
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.message?.includes('no user record')) {
        userRecord = await auth.createUser({
          email: 'admin@hotel.com',
          emailVerified: true,
          password: 'admin123',
          displayName: 'Admin User',
        });
        console.log('✅ Admin user created in Firebase Auth');
      } else {
        throw err;
      }
    }

    console.log(`👤 User UID: ${userRecord.uid}`);

    // Create or update user document in Firestore
    const userData = {
      username: 'admin',
      email: 'admin@hotel.com',
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890',
      address: 'Hotel Admin Office',
      role: 'super_admin',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.doc(`users/${userRecord.uid}`).set(userData, { merge: true });
    console.log('✅ Admin user document created/updated in Firestore\n');

    // 2. Create Privileges
    console.log('2️⃣ Creating privileges...');
    const privileges = [
      { name: 'manage_users', description: 'MANAGE USERS' },
      { name: 'manage_bookings', description: 'MANAGE BOOKINGS' },
      { name: 'manage_rooms', description: 'MANAGE ROOMS' },
      { name: 'manage_payments', description: 'MANAGE PAYMENTS' },
      { name: 'view_reports', description: 'VIEW REPORTS' },
      { name: 'manage_hr', description: 'MANAGE HR' },
      { name: 'manage_inventory', description: 'MANAGE INVENTORY' }
    ];

    for (const privilege of privileges) {
      await db.collection('privileges').add({
        ...privilege,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    console.log('✅ Privileges created\n');

    // 3. Create Sample Rooms
    console.log('3️⃣ Creating sample rooms...');
    const rooms = [
      { roomNumber: '101', type: 'Single', price: 100, status: 'available', capacity: 1 },
      { roomNumber: '102', type: 'Double', price: 150, status: 'available', capacity: 2 },
      { roomNumber: '201', type: 'Suite', price: 250, status: 'available', capacity: 4 },
      { roomNumber: '202', type: 'Deluxe', price: 200, status: 'available', capacity: 2 },
    ];

    for (const room of rooms) {
      await db.collection('rooms').add({
        ...room,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    console.log('✅ Sample rooms created\n');

    // 4. Create Sample Departments
    console.log('4️⃣ Creating sample departments...');
    const departments = [
      { name: 'Housekeeping', description: 'Room cleaning and maintenance' },
      { name: 'Front Desk', description: 'Guest check-in and concierge services' },
      { name: 'Kitchen', description: 'Food preparation and service' },
      { name: 'Security', description: 'Hotel security and safety' }
    ];

    for (const dept of departments) {
      await db.collection('departments').add({
        ...dept,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    console.log('✅ Sample departments created\n');

    console.log('🎉 Setup completed successfully!');
    console.log('\n📋 Admin Login Credentials:');
    console.log('Email: admin@hotel.com');
    console.log('Password: admin123');
    console.log('Role: super_admin');
    console.log('\n🔗 You can now login at: http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Stack:', error.stack);
    process.exitCode = 1;
  }
}

setupAdminAndData();
