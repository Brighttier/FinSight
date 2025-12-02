/**
 * Service for calling Firebase Cloud Functions for user management
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { auth } from './firebase';
import type { ModulePermissions, UserRole } from '../types';

// Initialize functions with the app
const functions = getFunctions(app);

// Helper to ensure user is authenticated before calling functions
async function ensureAuthenticated(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to call this function');
  }
  // Force token refresh to ensure we have a valid token
  await currentUser.getIdToken(true);
}

interface CreateUserInput {
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  permissions: ModulePermissions;
  invitedBy: string;
}

interface CreateUserResult {
  success: boolean;
  uid: string;
  appUserId: string;
  resetLink: string;
  message: string;
}

interface DeleteUserResult {
  success: boolean;
  message: string;
}

interface PasswordResetResult {
  success: boolean;
  resetLink: string;
  message: string;
}

/**
 * Create a new user in Firebase Auth and Firestore
 * This calls a Cloud Function that uses Admin SDK
 */
export async function createUserWithAuth(data: CreateUserInput): Promise<CreateUserResult> {
  await ensureAuthenticated();
  const createAppUser = httpsCallable<CreateUserInput, CreateUserResult>(functions, 'createAppUser');
  const result = await createAppUser(data);
  return result.data;
}

/**
 * Delete a user from Firebase Auth
 */
export async function deleteUserFromAuth(email: string): Promise<DeleteUserResult> {
  await ensureAuthenticated();
  const deleteAppUser = httpsCallable<{ email: string }, DeleteUserResult>(functions, 'deleteAppUser');
  const result = await deleteAppUser({ email });
  return result.data;
}

/**
 * Generate a password reset link for a user
 */
export async function generatePasswordResetLink(email: string): Promise<PasswordResetResult> {
  await ensureAuthenticated();
  const sendPasswordReset = httpsCallable<{ email: string }, PasswordResetResult>(functions, 'sendPasswordReset');
  const result = await sendPasswordReset({ email });
  return result.data;
}
