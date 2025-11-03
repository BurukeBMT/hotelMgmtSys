const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, doc, setDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAsFuX2L8ZgzRyf0ThYnKwkHDahqC9i-yE",
  authDomain: "heaven-project-7bb83.firebaseapp.com",
  projectId: "heaven-project-7bb83",
  storageBucket: "heaven-project-7bb83.firebasestorage.app",
  messagingSenderId: "958216608835",
  appId: "1:958216608835:web:844f2244c2197a377d08f6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function setupAdminAndData() {
  try {
    console.log('🚀 Starting admin and data setup...\n');

    // 1. Create Admin User
    console.log('1️⃣ Creating admin user...');
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, 'admin@hotel.com', 'admin123');
      console.log('✅ Admin user created in Firebase Auth');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('⚠️ Admin user already exists, skipping creation');
        // Try to sign in to get user credential
        const { signInWithEmailAndPassword } = require('firebase/auth');
        userCredential = await signInWithEmailAndPassword(auth, 'admin@hotel.com', 'admin123');
      } else {
        throw error;
      }
    }

    const user = userCredential.user;
    console.log(`👤 User UID: ${user.uid}`);

    // Create user document in Firestore
    const userData = {
      username: 'admin',
      email: 'admin@hotel.com',
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890',
      address: 'Hotel Admin Office',
      role: 'super_admin',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    console.log('✅ Admin user document created in Firestore\n');

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
      await setDoc(doc(collection(db, 'privileges')), {
        ...privilege,
        createdAt: serverTimestamp()
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
      await setDoc(doc(collection(db, 'rooms')), {
        ...room,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
      await setDoc(doc(collection(db, 'departments')), {
        ...dept,
        createdAt: serverTimestamp()
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
  }
}

setupAdminAndData();
