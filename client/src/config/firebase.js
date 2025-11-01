import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAsFuX2L8ZgzRyf0ThYnKwkHDahqC9i-yE",
  authDomain: "heaven-project-7bb83.firebaseapp.com",
  projectId: "heaven-project-7bb83",
  storageBucket: "heaven-project-7bb83.firebasestorage.app",
  messagingSenderId: "958216608835",
  appId: "1:958216608835:web:844f2244c2197a377d08f6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

