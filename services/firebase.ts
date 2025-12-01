import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase configuration - uses environment variables with fallback to hardcoded values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAlg2VBO7f65LdMjqg5zH8Ca6OsZHFjPi8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "velo-479115.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "velo-479115",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "velo-479115.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "341467003750",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:341467003750:web:cde4c7ffc428b647d166a7",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-T7FGHZGETP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics only in browser environment
export const initAnalytics = async () => {
  if (await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};

export default app;
