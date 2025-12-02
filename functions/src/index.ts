import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

interface CreateUserData {
  email: string;
  name: string;
  role: string;
  organizationId: string;
  permissions: Record<string, string>;
  invitedBy: string;
  tempPassword?: string;
}

/**
 * Cloud Function to create a user in Firebase Auth and Firestore appUsers
 * Only callable by authenticated users with user_management permission
 */
export const createAppUser = functions.https.onCall(async (request) => {
  const { data, auth } = request;

  // Check if caller is authenticated
  if (!auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to create users'
    );
  }

  // Verify caller has permission (check their appUser record)
  const callerSnapshot = await admin.firestore()
    .collection('appUsers')
    .where('email', '==', auth.token.email?.toLowerCase())
    .limit(1)
    .get();

  if (callerSnapshot.empty) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Caller not found in app users'
    );
  }

  const caller = callerSnapshot.docs[0].data();
  const callerPermission = caller.permissions?.user_management;

  if (callerPermission !== 'edit' && callerPermission !== 'full') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You do not have permission to create users'
    );
  }

  // Validate input
  const { email, name, role, organizationId, permissions, invitedBy, tempPassword } = data as CreateUserData;

  if (!email || !name || !role || !organizationId || !permissions) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields: email, name, role, organizationId, permissions'
    );
  }

  // Check if user already exists in Auth
  try {
    const existingUser = await admin.auth().getUserByEmail(email.toLowerCase());
    if (existingUser) {
      throw new functions.https.HttpsError(
        'already-exists',
        'A user with this email already exists in Firebase Auth'
      );
    }
  } catch (error: any) {
    // User doesn't exist, which is what we want
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }
  }

  // Generate a temporary password if not provided
  const password = tempPassword || generateTempPassword();

  try {
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email.toLowerCase(),
      password: password,
      displayName: name,
      emailVerified: false,
    });

    // Create user in Firestore appUsers collection
    const appUserRef = await admin.firestore().collection('appUsers').add({
      organizationId,
      email: email.toLowerCase(),
      name,
      role,
      permissions,
      isActive: true,
      invitedBy,
      invitedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send password reset email so user can set their own password
    const resetLink = await admin.auth().generatePasswordResetLink(email.toLowerCase());

    return {
      success: true,
      uid: userRecord.uid,
      appUserId: appUserRef.id,
      resetLink,
      message: `User created successfully. A password reset link has been generated.`,
    };
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to create user'
    );
  }
});

/**
 * Cloud Function to delete a user from Firebase Auth
 */
export const deleteAppUser = functions.https.onCall(async (request) => {
  const { data, auth } = request;

  if (!auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to delete users'
    );
  }

  // Verify caller has full permission
  const callerSnapshot = await admin.firestore()
    .collection('appUsers')
    .where('email', '==', auth.token.email?.toLowerCase())
    .limit(1)
    .get();

  if (callerSnapshot.empty) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Caller not found in app users'
    );
  }

  const caller = callerSnapshot.docs[0].data();
  if (caller.permissions?.user_management !== 'full') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You need full user management permission to delete users'
    );
  }

  const { email } = data as { email: string };

  if (!email) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email is required'
    );
  }

  try {
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email.toLowerCase());

    // Delete from Firebase Auth
    await admin.auth().deleteUser(userRecord.uid);

    return {
      success: true,
      message: 'User deleted from Firebase Auth',
    };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return {
        success: true,
        message: 'User not found in Firebase Auth (may have already been deleted)',
      };
    }
    console.error('Error deleting user:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to delete user'
    );
  }
});

/**
 * Cloud Function to send password reset email
 */
export const sendPasswordReset = functions.https.onCall(async (request) => {
  const { data, auth } = request;

  if (!auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in'
    );
  }

  const { email } = data as { email: string };

  if (!email) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email is required'
    );
  }

  try {
    const resetLink = await admin.auth().generatePasswordResetLink(email.toLowerCase());

    return {
      success: true,
      resetLink,
      message: 'Password reset link generated',
    };
  } catch (error: any) {
    console.error('Error generating reset link:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to generate password reset link'
    );
  }
});

/**
 * Generate a random temporary password
 */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
