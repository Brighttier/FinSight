/**
 * Service for calling Firebase Cloud Functions for user management
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';
import type { ModulePermissions, UserRole } from '../types';

const functions = getFunctions(app);

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
  const createAppUser = httpsCallable<CreateUserInput, CreateUserResult>(functions, 'createAppUser');
  const result = await createAppUser(data);
  return result.data;
}

/**
 * Delete a user from Firebase Auth
 */
export async function deleteUserFromAuth(email: string): Promise<DeleteUserResult> {
  const deleteAppUser = httpsCallable<{ email: string }, DeleteUserResult>(functions, 'deleteAppUser');
  const result = await deleteAppUser({ email });
  return result.data;
}

/**
 * Generate a password reset link for a user
 */
export async function generatePasswordResetLink(email: string): Promise<PasswordResetResult> {
  const sendPasswordReset = httpsCallable<{ email: string }, PasswordResetResult>(functions, 'sendPasswordReset');
  const result = await sendPasswordReset({ email });
  return result.data;
}
