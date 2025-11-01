/**
 * Firebase Service Module
 *
 * This module replaces the previous axios-based API service with Firebase SDK calls.
 * It uses Firebase Authentication for user management, Cloud Firestore for data storage,
 * and Firebase Storage for file uploads.
 */

import {
  // Auth
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  onAuthStateChanged,
  // Firestore
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  // Storage
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/firestore';
import { auth, db, storage } from '../config/firebase';

// Helper to convert Firestore timestamp to JS date
const convertTimestamp = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  return timestamp;
};

// Helper to normalize user data
const normalizeUser = (userDoc, firebaseUser) => {
  if (!userDoc && !firebaseUser) return null;
  
  const userData = userDoc?.data() || {};
  return {
    id: firebaseUser?.uid || userDoc?.id || userData.id,
    username: userData.username || firebaseUser?.email?.split('@')[0] || '',
    email: firebaseUser?.email || userData.email || '',
    firstName: userData.firstName || userData.first_name || '',
    lastName: userData.lastName || userData.last_name || '',
    role: userData.role || 'client',
    phone: userData.phone || '',
    address: userData.address || '',
    createdAt: convertTimestamp(userData.createdAt) || userData.created_at || null,
  };
};

// Auth service
export const authService = {
  login: async (credentials) => {
    try {
      const { username, email, password } = credentials;
      
      let actualEmail = email;
      
      // If username provided but no email, find user by username in Firestore
      if (username && !email) {
        const usersRef = collection(db, 'users');
        const usernameQuery = query(usersRef, where('username', '==', username));
        const usernameSnap = await getDocs(usernameQuery);
        
        if (usernameSnap.empty) {
          throw new Error('Invalid credentials');
        }
        
        const userDoc = usernameSnap.docs[0];
        const userData = userDoc.data();
        actualEmail = userData.email;
        
        if (!actualEmail) {
          throw new Error('User email not found');
        }
      } else if (!actualEmail) {
        throw new Error('Email or username is required');
      }
      
      // Sign in with Firebase Auth using the email
      const userCredential = await signInWithEmailAndPassword(auth, actualEmail, password);
      const firebaseUser = userCredential.user;
      
      // Get user document from Firestore (should match Firebase Auth UID)
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      // If document doesn't exist, create it (migration scenario)
      if (!userDoc.exists()) {
        // Try to find by email as fallback
        const usersRef = collection(db, 'users');
        const emailQuery = query(usersRef, where('email', '==', actualEmail));
        const emailSnap = await getDocs(emailQuery);
        
        if (!emailSnap.empty) {
          const existingDoc = emailSnap.docs[0];
          const existingData = existingDoc.data();
          // Create document with Firebase Auth UID
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            ...existingData,
            updatedAt: serverTimestamp(),
          });
        } else {
          throw new Error('User profile not found');
        }
      }
      
      const finalUserDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      const normalizedUser = normalizeUser(finalUserDoc, firebaseUser);
      
      return {
        token: await firebaseUser.getIdToken(),
        user: normalizedUser,
      };
    } catch (error) {
      console.error('Login error:', error);
      // Provide user-friendly error messages
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Invalid credentials');
      }
      throw new Error(error.message || 'Login failed');
    }
  },

  register: async (registrationData) => {
    try {
      const { email, password, username, firstName, lastName, phone, address, role = 'client' } = registrationData;
      
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Create user document in Firestore
      const userData = {
        username,
        email,
        firstName,
        lastName,
        phone: phone || '',
        address: address || '',
        role,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      
      // Update Firebase Auth profile
      await updateFirebaseProfile(firebaseUser, {
        displayName: `${firstName} ${lastName}`,
      });
      
      const normalizedUser = normalizeUser({ id: firebaseUser.uid, data: () => userData }, firebaseUser);
      
      return {
        token: await firebaseUser.getIdToken(),
        user: normalizedUser,
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  getProfile: async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      return normalizeUser(userDoc, user);
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  updateProfile: async (profileData) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      
      const userRef = doc(db, 'users', user.uid);
      const updateData = {
        firstName: profileData.firstName || profileData.first_name,
        lastName: profileData.lastName || profileData.last_name,
        phone: profileData.phone || '',
        address: profileData.address || '',
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(userRef, updateData);
      
      if (profileData.firstName || profileData.lastName) {
        await updateFirebaseProfile(user, {
          displayName: `${updateData.firstName} ${updateData.lastName}`,
        });
      }
      
      const updatedDoc = await getDoc(userRef);
      return normalizeUser(updatedDoc, user);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  changePassword: async ({ current_password, new_password }) => {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('Not authenticated');
      
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, current_password);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, new_password);
      
      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      console.error('Change password error:', error);
      throw new Error(error.message || 'Password change failed');
    }
  },

  onAuthStateChanged: (callback) => {
    return onAuthStateChanged(auth, callback);
  },
};

// Generic CRUD helper for Firestore collections
const createService = (collectionName) => ({
  getAll: async (filters = {}) => {
    try {
      let q = query(collection(db, collectionName));
      
      // Apply filters
      Object.entries(filters).forEach(([field, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          q = query(q, where(field, '==', value));
        }
      });
      
      q = query(q, orderBy('createdAt', 'desc'));
      
      const snapshot = await getDocs(q);
      return {
        success: true,
        data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      };
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`${collectionName} not found`);
      }
      
      return {
        success: true,
        data: { id: docSnap.id, ...docSnap.data() },
      };
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      throw error;
    }
  },

  create: async (data) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      
      const newDocRef = doc(collection(db, collectionName));
      const docData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
      };
      
      await setDoc(newDocRef, docData);
      
      return {
        success: true,
        message: `${collectionName} created successfully`,
        data: { id: newDocRef.id, ...docData },
      };
    } catch (error) {
      console.error(`Error creating ${collectionName}:`, error);
      throw error;
    }
  },

  update: async (id, data) => {
    try {
      const docRef = doc(db, collectionName, id);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(docRef, updateData);
      
      return {
        success: true,
        message: `${collectionName} updated successfully`,
      };
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      
      return {
        success: true,
        message: `${collectionName} deleted successfully`,
      };
    } catch (error) {
      console.error(`Error deleting ${collectionName}:`, error);
      throw error;
    }
  },
});

// Users service
export const usersService = createService('users');

// Bookings service with custom methods
export const bookingsService = {
  ...createService('bookings'),
  
  getByGuestId: async (guestId) => {
    try {
      const q = query(
        collection(db, 'bookings'),
        where('guestId', '==', guestId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return {
        success: true,
        data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      };
    } catch (error) {
      console.error('Error fetching bookings by guest:', error);
      throw error;
    }
  },

  checkIn: async (id) => {
    try {
      const bookingRef = doc(db, 'bookings', id);
      const bookingDoc = await getDoc(bookingRef);
      
      if (!bookingDoc.exists()) {
        throw new Error('Booking not found');
      }
      
      const booking = bookingDoc.data();
      if (booking.status !== 'confirmed') {
        throw new Error('Only confirmed bookings can be checked in');
      }
      
      await updateDoc(bookingRef, {
        status: 'checked_in',
        updatedAt: serverTimestamp(),
      });
      
      // Update room status if roomId exists
      if (booking.roomId) {
        await updateDoc(doc(db, 'rooms', booking.roomId), {
          status: 'occupied',
          updatedAt: serverTimestamp(),
        });
      }
      
      return { success: true, message: 'Guest checked in successfully' };
    } catch (error) {
      console.error('Check-in error:', error);
      throw error;
    }
  },

  checkOut: async (id) => {
    try {
      const bookingRef = doc(db, 'bookings', id);
      const bookingDoc = await getDoc(bookingRef);
      
      if (!bookingDoc.exists()) {
        throw new Error('Booking not found');
      }
      
      const booking = bookingDoc.data();
      if (booking.status !== 'checked_in') {
        throw new Error('Only checked-in bookings can be checked out');
      }
      
      await updateDoc(bookingRef, {
        status: 'checked_out',
        updatedAt: serverTimestamp(),
      });
      
      // Update room status if roomId exists
      if (booking.roomId) {
        await updateDoc(doc(db, 'rooms', booking.roomId), {
          status: 'available',
          updatedAt: serverTimestamp(),
        });
      }
      
      return { success: true, message: 'Guest checked out successfully' };
    } catch (error) {
      console.error('Check-out error:', error);
      throw error;
    }
  },
};

// Rooms service
export const roomsService = createService('rooms');

// Guests service
export const guestsService = createService('guests');

// HR service
export const hrService = {
  ...createService('employees'),
  
  getDepartments: async () => {
    try {
      const snapshot = await getDocs(collection(db, 'departments'));
      return {
        success: true,
        data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      };
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  },
};

// Payments service
export const paymentsService = {
  ...createService('payments'),
  
  createCheckoutSession: async (data) => {
    // Note: Stripe checkout sessions typically require a backend
    // For a pure Firebase implementation, you might want to use Firebase Functions
    // or handle payment processing differently
    console.warn('Stripe checkout requires backend - consider using Firebase Functions');
    throw new Error('Payment processing requires backend setup');
  },
};

// Admin service
export const adminService = {
  getUsers: async (params = {}) => {
    try {
      let q = query(collection(db, 'users'));
      
      if (params.role) {
        q = query(q, where('role', '==', params.role));
      }
      
      if (params.is_active !== undefined) {
        q = query(q, where('isActive', '==', params.is_active === 'true'));
      }
      
      q = query(q, orderBy('createdAt', 'desc'));
      
      const snapshot = await getDocs(q);
      return {
        success: true,
        data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  createUser: async (userData) => {
    return usersService.create(userData);
  },

  updateUser: async (id, userData) => {
    return usersService.update(id, userData);
  },

  deleteUser: async (id) => {
    return usersService.delete(id);
  },

  getDashboardStats: async () => {
    try {
      // Get counts from various collections
      const [bookings, rooms, users, payments] = await Promise.all([
        getDocs(collection(db, 'bookings')),
        getDocs(collection(db, 'rooms')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'payments')),
      ]);
      
      return {
        success: true,
        data: {
          totalBookings: bookings.size,
          totalRooms: rooms.size,
          totalUsers: users.size,
          totalRevenue: payments.docs.reduce((sum, doc) => {
            const data = doc.data();
            return sum + (parseFloat(data.amount || 0));
          }, 0),
        },
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },
};

// Pricing service
export const pricingService = createService('pricing');

// Cabins service
export const cabinsService = createService('cabins');

// Payment Gateway service (placeholder - requires backend or Firebase Functions)
export const paymentGatewayService = {
  getPaymentMethods: async () => {
    return { success: true, data: [] };
  },
  processPayment: async (data) => {
    console.warn('Payment processing requires backend setup');
    throw new Error('Payment processing requires backend setup');
  },
  getPaymentHistory: async () => {
    return paymentsService.getAll();
  },
};

// Notifications service
export const notificationsService = {
  ...createService('notifications'),
  
  getNotificationCount: async () => {
    try {
      const user = auth.currentUser;
      if (!user) return { success: true, count: 0 };
      
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      return { success: true, count: snapshot.size };
    } catch (error) {
      console.error('Error getting notification count:', error);
      throw error;
    }
  },

  markAsRead: async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), {
        read: true,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  markAllAsRead: async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      
      const updates = snapshot.docs.map(doc =>
        updateDoc(doc.ref, {
          read: true,
          updatedAt: serverTimestamp(),
        })
      );
      
      await Promise.all(updates);
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },
};

// Reports service
export const reportsService = {
  getDashboardStats: async () => {
    return adminService.getDashboardStats();
  },

  getBookingStats: async (period) => {
    try {
      const snapshot = await getDocs(collection(db, 'bookings'));
      // Filter by period if needed
      return {
        success: true,
        data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      };
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      throw error;
    }
  },

  getRevenueStats: async (period) => {
    try {
      const snapshot = await getDocs(collection(db, 'payments'));
      const payments = snapshot.docs.map(doc => doc.data());
      
      return {
        success: true,
        data: {
          total: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
          count: payments.length,
        },
      };
    } catch (error) {
      console.error('Error fetching revenue stats:', error);
      throw error;
    }
  },

  getOccupancyStats: async (period) => {
    try {
      const [roomsSnapshot, bookingsSnapshot] = await Promise.all([
        getDocs(collection(db, 'rooms')),
        getDocs(query(collection(db, 'bookings'), where('status', 'in', ['confirmed', 'checked_in']))),
      ]);
      
      const totalRooms = roomsSnapshot.size;
      const occupiedRooms = bookingsSnapshot.size;
      
      return {
        success: true,
        data: {
          totalRooms,
          occupiedRooms,
          occupancyRate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0,
        },
      };
    } catch (error) {
      console.error('Error fetching occupancy stats:', error);
      throw error;
    }
  },
};

// Storage service for file uploads
export const storageService = {
  uploadFile: async (file, path) => {
    try {
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return { success: true, url: downloadURL };
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  },

  deleteFile: async (path) => {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      return { success: true };
    } catch (error) {
      console.error('File delete error:', error);
      throw error;
    }
  },
};

