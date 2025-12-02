"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordReset = exports.deleteAppUser = exports.createAppUser = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
// Owner email that has full access by default
const OWNER_EMAIL = 'akhare@brighttier.com';
/**
 * Cloud Function to create a user in Firebase Auth and Firestore appUsers
 * Only callable by authenticated users with user_management permission
 */
exports.createAppUser = functions.https.onCall(async (request) => {
    var _a, _b;
    const { data, auth } = request;
    // Check if caller is authenticated
    if (!auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to create users');
    }
    // Check if caller is the owner (bypass appUsers check)
    const callerEmail = (_a = auth.token.email) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    const isOwner = callerEmail === OWNER_EMAIL.toLowerCase();
    if (!isOwner) {
        // Verify caller has permission (check their appUser record)
        const callerSnapshot = await admin.firestore()
            .collection('appUsers')
            .where('email', '==', callerEmail)
            .limit(1)
            .get();
        if (callerSnapshot.empty) {
            throw new functions.https.HttpsError('permission-denied', 'Caller not found in app users');
        }
        const caller = callerSnapshot.docs[0].data();
        const callerPermission = (_b = caller.permissions) === null || _b === void 0 ? void 0 : _b.user_management;
        if (callerPermission !== 'edit' && callerPermission !== 'full') {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to create users');
        }
    }
    // Validate input
    const { email, name, role, organizationId, permissions, invitedBy, tempPassword } = data;
    if (!email || !name || !role || !organizationId || !permissions) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: email, name, role, organizationId, permissions');
    }
    // Check if user already exists in Auth
    try {
        const existingUser = await admin.auth().getUserByEmail(email.toLowerCase());
        if (existingUser) {
            throw new functions.https.HttpsError('already-exists', 'A user with this email already exists in Firebase Auth');
        }
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('Error creating user:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to create user');
    }
});
/**
 * Cloud Function to delete a user from Firebase Auth
 */
exports.deleteAppUser = functions.https.onCall(async (request) => {
    var _a, _b;
    const { data, auth } = request;
    if (!auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to delete users');
    }
    // Check if caller is the owner (bypass appUsers check)
    const callerEmail = (_a = auth.token.email) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    const isOwner = callerEmail === OWNER_EMAIL.toLowerCase();
    if (!isOwner) {
        // Verify caller has full permission
        const callerSnapshot = await admin.firestore()
            .collection('appUsers')
            .where('email', '==', callerEmail)
            .limit(1)
            .get();
        if (callerSnapshot.empty) {
            throw new functions.https.HttpsError('permission-denied', 'Caller not found in app users');
        }
        const caller = callerSnapshot.docs[0].data();
        if (((_b = caller.permissions) === null || _b === void 0 ? void 0 : _b.user_management) !== 'full') {
            throw new functions.https.HttpsError('permission-denied', 'You need full user management permission to delete users');
        }
    }
    const { email } = data;
    if (!email) {
        throw new functions.https.HttpsError('invalid-argument', 'Email is required');
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
    }
    catch (error) {
        if (error.code === 'auth/user-not-found') {
            return {
                success: true,
                message: 'User not found in Firebase Auth (may have already been deleted)',
            };
        }
        console.error('Error deleting user:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to delete user');
    }
});
/**
 * Cloud Function to send password reset email
 */
exports.sendPasswordReset = functions.https.onCall(async (request) => {
    const { data, auth } = request;
    if (!auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in');
    }
    const { email } = data;
    if (!email) {
        throw new functions.https.HttpsError('invalid-argument', 'Email is required');
    }
    try {
        const resetLink = await admin.auth().generatePasswordResetLink(email.toLowerCase());
        return {
            success: true,
            resetLink,
            message: 'Password reset link generated',
        };
    }
    catch (error) {
        console.error('Error generating reset link:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to generate password reset link');
    }
});
/**
 * Generate a random temporary password
 */
function generateTempPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}
//# sourceMappingURL=index.js.map