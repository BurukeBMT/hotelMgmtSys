# Firebase Migration Complete

This document describes the migration from Node.js/Express/MySQL backend to Firebase.

## Migration Summary

✅ **Completed:**
- Removed entire `/server` folder and all backend dependencies
- Integrated Firebase SDK (Auth, Firestore, Storage)
- Replaced all API calls with Firebase SDK functions
- Updated authentication to use Firebase Auth
- Updated all service calls to use Firestore instead of REST API

## Firebase Configuration

Firebase config is located at: `client/src/config/firebase.js`

Your Firebase project configuration:
- **Project ID**: `heaven-project-7bb83`
- **Auth Domain**: `heaven-project-7bb83.firebaseapp.com`
- **Storage Bucket**: `heaven-project-7bb83.firebasestorage.app`

## Firestore Collections Structure

The following collections are used in Firestore:

### Core Collections:
- `users` - User accounts with roles (super_admin, admin, manager, staff, client)
- `bookings` - Room bookings with status (pending, confirmed, checked_in, checked_out, cancelled)
- `rooms` - Room inventory with room types and availability
- `guests` - Guest information
- `employees` - HR employee records
- `departments` - Department information
- `payments` - Payment records
- `notifications` - User notifications
- `pricing` - Price tracking data
- `cabins` - Cabin listings (if applicable)

### Document Structure Examples:

**Users Collection:**
```javascript
{
  username: string,
  email: string,
  firstName: string,
  lastName: string,
  phone: string,
  address: string,
  role: 'super_admin' | 'admin' | 'manager' | 'staff' | 'client',
  isActive: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: string (user ID)
}
```

**Bookings Collection:**
```javascript
{
  bookingNumber: string,
  guestId: string,
  roomId: string,
  checkInDate: string (ISO date),
  checkOutDate: string (ISO date),
  adults: number,
  children: number,
  totalAmount: number,
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled',
  specialRequests: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: string (user ID)
}
```

## Firebase Security Rules

**IMPORTANT:** You need to set up Firestore Security Rules in your Firebase Console.

### Basic Security Rules Template:

Go to Firebase Console → Firestore Database → Rules tab and update with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to get user role
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    // Helper function to check if user is admin
    function isAdmin() {
      return isAuthenticated() && 
             getUserRole() in ['super_admin', 'admin', 'manager'];
    }
    
    // Helper function to check if user is owner
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      // Users can read their own profile
      allow read: if isAuthenticated() && (isOwner(userId) || isAdmin());
      // Users can update their own profile (except role)
      allow update: if isAuthenticated() && isOwner(userId) && 
                     (!('role' in request.resource.data.diff(resource.data).affectedKeys()) || isAdmin());
      // Only admins can create/delete users
      allow create: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Bookings collection
    match /bookings/{bookingId} {
      // Authenticated users can read bookings
      allow read: if isAuthenticated();
      // Users can create bookings
      allow create: if isAuthenticated();
      // Users can update their own bookings, admins can update any
      allow update: if isAuthenticated() && 
                     (resource.data.guestId == request.auth.uid || isAdmin());
      // Only admins can delete bookings
      allow delete: if isAdmin();
    }
    
    // Rooms collection
    match /rooms/{roomId} {
      // Anyone authenticated can read rooms
      allow read: if isAuthenticated();
      // Only admins can create/update/delete rooms
      allow write: if isAdmin();
    }
    
    // Guests collection
    match /guests/{guestId} {
      // Authenticated users can read guests
      allow read: if isAuthenticated();
      // Users can create guests, admins can update/delete
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }
    
    // Employees collection
    match /employees/{employeeId} {
      // Only HR/admins can access
      allow read, write: if isAdmin();
    }
    
    // Payments collection
    match /payments/{paymentId} {
      // Users can read their own payments
      allow read: if isAuthenticated() && 
                   (resource.data.userId == request.auth.uid || isAdmin());
      // Users can create payments, admins can update/delete
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      // Users can read/update their own notifications
      allow read: if isAuthenticated() && 
                   (resource.data.userId == request.auth.uid || isAdmin());
      allow update: if isAuthenticated() && 
                     resource.data.userId == request.auth.uid;
      // Admins can create notifications
      allow create: if isAdmin();
      allow delete: if isAuthenticated() && 
                     resource.data.userId == request.auth.uid;
    }
    
    // Pricing collection
    match /pricing/{pricingId} {
      // Anyone authenticated can read
      allow read: if isAuthenticated();
      // Only admins can write
      allow write: if isAdmin();
    }
    
    // Cabins collection
    match /cabins/{cabinId} {
      // Anyone authenticated can read
      allow read: if isAuthenticated();
      // Only admins can write
      allow write: if isAdmin();
    }
    
    // Departments collection
    match /departments/{departmentId} {
      // Anyone authenticated can read
      allow read: if isAuthenticated();
      // Only admins can write
      allow write: if isAdmin();
    }
  }
}
```

### Storage Rules:

Go to Firebase Console → Storage → Rules tab:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can upload files to their own folder
    match /users/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read, admin write for hotel assets
    match /hotel/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if false; // Disable writes for now, or add admin check
    }
  }
}
```

## Authentication

The app now uses Firebase Authentication with email/password. 

### Features:
- User registration with email/password
- Login with username or email
- Password change functionality
- Automatic session management
- Auth state persistence

### Note on Login:
The login service searches for users by username or email in Firestore, then authenticates with Firebase Auth using the email found. Make sure user emails are stored correctly in Firestore when registering.

## Installation & Setup

1. **Install dependencies:**
   ```bash
   cd client
   npm install
   ```

2. **Firebase is already configured** in `client/src/config/firebase.js`

3. **Set up Firestore Security Rules** (see above)

4. **Enable Authentication in Firebase Console:**
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable "Email/Password" provider

5. **Create Firestore Database:**
   - Go to Firebase Console → Firestore Database
   - Create database in production mode
   - Apply the security rules provided above

6. **Start the app:**
   ```bash
   cd client
   npm start
   ```

## Data Migration Notes

If you have existing data in MySQL, you'll need to:
1. Export data from MySQL
2. Convert to Firestore document format
3. Import into Firestore (you can use a script or Firebase CLI)

Consider using Firebase CLI or a Node.js script for bulk data migration.

## Differences from Previous Implementation

### Authentication:
- **Before**: JWT tokens stored in localStorage
- **Now**: Firebase Auth handles tokens automatically, session persists across refreshes

### API Calls:
- **Before**: REST API endpoints (`/api/users`, `/api/bookings`, etc.)
- **Now**: Direct Firestore operations (`collection(db, 'users')`, etc.)

### Data Structure:
- **Before**: SQL tables with joins
- **Now**: Firestore collections with references (can denormalize for better performance)

### File Uploads:
- **Before**: Backend handled file uploads to server
- **Now**: Direct uploads to Firebase Storage

## Payment Processing

**Note:** Stripe checkout sessions require server-side implementation. For a pure client-side app:

1. Use Firebase Functions (recommended) - deploy serverless functions
2. Use Stripe Checkout client-side redirect (limited)
3. Implement alternative payment method

The `paymentGatewayService.createCheckoutSession()` currently throws an error - you'll need to implement this with Firebase Functions or another solution.

## Testing

After migration, test:
1. User registration and login
2. Creating bookings
3. Reading/writing to all collections
4. File uploads (if used)
5. Role-based access control

## Next Steps

1. **Set up Firebase Security Rules** (critical for production)
2. **Migrate existing data** from MySQL to Firestore (if applicable)
3. **Test all functionality** thoroughly
4. **Deploy to Firebase Hosting** (recommended for static hosting):
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   npm run build
   firebase deploy
   ```

## Troubleshooting

### Common Issues:

1. **"Permission denied" errors:**
   - Check Firestore Security Rules
   - Verify user authentication status
   - Check user role in Firestore

2. **Login not working:**
   - Verify email is correct in Firestore `users` collection
   - Check Firebase Auth sign-in method is enabled
   - Ensure user document exists with correct email field

3. **Build errors:**
   - Run `npm install` to ensure Firebase SDK is installed
   - Check that `firebase` package is in package.json

## Support

For Firebase documentation:
- [Firebase Auth](https://firebase.google.com/docs/auth)
- [Cloud Firestore](https://firebase.google.com/docs/firestore)
- [Firebase Storage](https://firebase.google.com/docs/storage)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

