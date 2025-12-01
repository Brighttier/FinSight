import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User } from '../types';

// Sign up with email and password
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;

  // Update display name
  await updateProfile(firebaseUser, { displayName: name });

  // Create user document in Firestore
  const userData: User = {
    uid: firebaseUser.uid,
    email: firebaseUser.email!,
    name: name,
    role: 'director', // Default role for new users
  };

  await setDoc(doc(db, 'users', firebaseUser.uid), {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return userData;
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;

  // Get user data from Firestore
  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

  if (userDoc.exists()) {
    return userDoc.data() as User;
  }

  // Fallback if user document doesn't exist
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email!,
    name: firebaseUser.displayName || 'User',
    role: 'director',
  };
}

// Sign in with Google
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const firebaseUser = userCredential.user;

  // Check if user document exists
  const userDocRef = doc(db, 'users', firebaseUser.uid);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    return userDoc.data() as User;
  }

  // Create new user document for Google sign-in
  const userData: User = {
    uid: firebaseUser.uid,
    email: firebaseUser.email!,
    name: firebaseUser.displayName || 'User',
    role: 'director',
  };

  await setDoc(userDocRef, {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return userData;
}

// Sign out
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// Send password reset email
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// Get current user data from Firestore
export async function getCurrentUserData(): Promise<User | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;

  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
  if (userDoc.exists()) {
    return userDoc.data() as User;
  }

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email!,
    name: firebaseUser.displayName || 'User',
    role: 'director',
  };
}

// Subscribe to auth state changes
export function subscribeToAuthChanges(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

// Update user profile (name)
export async function updateUserProfile(name: string): Promise<void> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('No authenticated user');

  await updateProfile(firebaseUser, { displayName: name });
  await updateDoc(doc(db, 'users', firebaseUser.uid), {
    name,
    updatedAt: serverTimestamp(),
  });
}

// Update user email
export async function updateUserEmail(
  newEmail: string,
  currentPassword: string
): Promise<void> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser || !firebaseUser.email) throw new Error('No authenticated user');

  // Re-authenticate before sensitive operation
  const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
  await reauthenticateWithCredential(firebaseUser, credential);

  await updateEmail(firebaseUser, newEmail);
  await updateDoc(doc(db, 'users', firebaseUser.uid), {
    email: newEmail,
    updatedAt: serverTimestamp(),
  });
}

// Update user password
export async function updateUserPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser || !firebaseUser.email) throw new Error('No authenticated user');

  // Re-authenticate before sensitive operation
  const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
  await reauthenticateWithCredential(firebaseUser, credential);

  await updatePassword(firebaseUser, newPassword);
}

// Delete user account
export async function deleteUserAccount(currentPassword: string): Promise<void> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser || !firebaseUser.email) throw new Error('No authenticated user');

  // Re-authenticate before sensitive operation
  const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
  await reauthenticateWithCredential(firebaseUser, credential);

  // Delete user document from Firestore
  await deleteDoc(doc(db, 'users', firebaseUser.uid));

  // Delete the Firebase Auth user
  await deleteUser(firebaseUser);
}

// Check if user signed in with Google (can't change password)
export function isGoogleUser(): boolean {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return false;
  return firebaseUser.providerData.some(
    (provider) => provider.providerId === 'google.com'
  );
}

// Get Firebase error message
export function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign in again to perform this action.';
    default:
      return 'An error occurred. Please try again.';
  }
}
