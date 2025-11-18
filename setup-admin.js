/**
 * Setup script to create initial SuperAdmin user and sample data
 * Run with: node setup-admin.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account.json'); // You'll need to add this file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "heaven-project-7bb83.firebasestorage.app" // Replace with your project ID
});

const db = admin.firestore();

async function setupSuperAdmin() {
  try {
    console.log('🚀 Setting up SuperAdmin and sample data...');

    // Create SuperAdmin user
    const superAdminData = {
      username: 'superadmin',
      email: 'superadmin@hotelmgmt.com',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      phone: '+1234567890',
      address: '123 Admin Street',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Create user in Auth (this will create the UID)
    const userRecord = await admin.auth().createUser({
      email: superAdminData.email,
      password: 'SuperAdmin123!',
      displayName: `${superAdminData.firstName} ${superAdminData.lastName}`,
    });

    console.log('✅ SuperAdmin user created in Auth:', userRecord.uid);

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set(superAdminData);
    console.log('✅ SuperAdmin document created in Firestore');

    // Create sample privileges
    const privileges = [
      'manage_users',
      'manage_hotels',
      'manage_rooms',
      'manage_bookings',
      'manage_hr',
      'view_reports',
      'process_refunds',
      'manage_payments',
    ];

    const privilegePromises = privileges.map(privilege =>
      db.collection('privileges').add({
        name: privilege,
        description: `${privilege.replace('_', ' ').toUpperCase()} permission`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    );

    await Promise.all(privilegePromises);
    console.log('✅ Sample privileges created');

    // Grant all privileges to SuperAdmin
    const privilegeDocs = await db.collection('privileges').get();
    const userPrivilegePromises = privilegeDocs.docs.map(doc =>
      db.collection('user_privileges').add({
        userId: userRecord.uid,
        privilege: doc.data().name,
        grantedAt: admin.firestore.FieldValue.serverTimestamp(),
        grantedBy: userRecord.uid,
      })
    );

    await Promise.all(userPrivilegePromises);
    console.log('✅ All privileges granted to SuperAdmin');

    // Create sample hotel
    const hotelData = {
      name: 'Grand Hotel',
      location: 'New York, NY',
      description: 'A luxurious hotel in the heart of the city',
      address: '123 Main St, New York, NY 10001',
      phone: '+1-555-0123',
      email: 'info@grandhotel.com',
      website: 'https://grandhotel.com',
      starRating: 5,
      amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Bar'],
      images: ['hotel1.jpg'],
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const hotelRef = await db.collection('hotels').add(hotelData);
    console.log('✅ Sample hotel created');

    // Create sample rooms
    const roomTypes = [
      {
        name: 'Standard Room',
        description: 'Comfortable room with basic amenities',
        pricePerNight: 150,
        capacity: 2,
        amenities: ['WiFi', 'TV', 'Air Conditioning'],
        images: ['room1.jpg'],
        totalInventory: 20,
        status: 'active',
        hotelId: hotelRef.id,
      },
      {
        name: 'Deluxe Room',
        description: 'Spacious room with premium amenities',
        pricePerNight: 250,
        capacity: 2,
        amenities: ['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'City View'],
        images: ['room2.jpg'],
        totalInventory: 10,
        status: 'active',
        hotelId: hotelRef.id,
      },
      {
        name: 'Suite',
        description: 'Luxurious suite with separate living area',
        pricePerNight: 400,
        capacity: 4,
        amenities: ['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'City View', 'Balcony'],
        images: ['room3.jpg'],
        totalInventory: 5,
        status: 'active',
        hotelId: hotelRef.id,
      },
    ];

    for (const roomType of roomTypes) {
      await db.collection('rooms').add({
        ...roomType,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    console.log('✅ Sample rooms created');

    // Create sample admin user
    const adminData = {
      username: 'admin',
      email: 'admin@hotelmgmt.com',
      firstName: 'Hotel',
      lastName: 'Admin',
      role: 'admin',
      phone: '+1234567891',
      address: '456 Admin Ave',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const adminUserRecord = await admin.auth().createUser({
      email: adminData.email,
      password: 'Admin123!',
      displayName: `${adminData.firstName} ${adminData.lastName}`,
    });

    await db.collection('users').doc(adminUserRecord.uid).set(adminData);

    // Grant some privileges to admin
    const adminPrivileges = ['manage_rooms', 'manage_bookings', 'view_reports'];
    const adminPrivilegePromises = adminPrivileges.map(privilege =>
      db.collection('user_privileges').add({
        userId: adminUserRecord.uid,
        privilege,
        grantedAt: admin.firestore.FieldValue.serverTimestamp(),
        grantedBy: userRecord.uid,
      })
    );

    await Promise.all(adminPrivilegePromises);
    console.log('✅ Sample admin user created with limited privileges');

    console.log('\n🎉 Setup complete!');
    console.log('SuperAdmin login:');
    console.log('Email: superadmin@hotelmgmt.com');
    console.log('Password: SuperAdmin123!');
    console.log('\nAdmin login:');
    console.log('Email: admin@hotelmgmt.com');
    console.log('Password: Admin123!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupSuperAdmin().then(() => {
  console.log('✅ Setup script completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('❌ Setup script failed:', error);
  process.exit(1);
});
