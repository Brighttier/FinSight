import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getAppUserByEmail,
  getAppUsersByOrganization,
  subscribeToAppUsers,
  createAppUser,
  updateAppUser,
  deleteAppUser as deleteAppUserFromFirestore,
  getOrganization,
  updateOrganization,
  createUserInvitation,
  subscribeToUserInvitations,
  updateUserInvitation,
  deleteUserInvitation,
  initializeOrganizationForUser,
} from '../services/firestoreService';
import { createUserWithAuth, deleteUserFromAuth, generatePasswordResetLink } from '../services/userFunctions';
import type {
  AppUser,
  AppUserInput,
  UserInvitation,
  UserRole,
  ModulePermissions,
  AppModule,
  PermissionLevel,
  Organization,
} from '../types';
import { DEFAULT_ROLE_PERMISSIONS, MODULE_INFO } from '../types';
import toast from 'react-hot-toast';

interface UseUserManagementOptions {
  realtime?: boolean;
}

export function useUserManagement(options: UseUserManagementOptions = {}) {
  const { user } = useAuth();
  const [currentAppUser, setCurrentAppUser] = useState<AppUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize current user and organization
  useEffect(() => {
    if (!user?.uid || !user?.email) {
      setCurrentAppUser(null);
      setOrganization(null);
      setLoading(false);
      return;
    }

    const initUser = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get or create app user
        let appUser = await getAppUserByEmail(user.email!);

        if (!appUser) {
          // First time login - initialize organization
          const { organizationId, appUserId } = await initializeOrganizationForUser(
            user.uid,
            user.email!,
            user.name || user.email!.split('@')[0]
          );
          appUser = await getAppUserByEmail(user.email!);
        }

        if (appUser) {
          setCurrentAppUser(appUser);

          // Load organization
          const org = await getOrganization(appUser.organizationId);
          setOrganization(org);
        }
      } catch (err: any) {
        console.error('Error initializing user:', err);
        setError(err.message || 'Failed to initialize user');
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, [user?.uid, user?.email]);

  // Load users and invitations
  useEffect(() => {
    if (!currentAppUser?.organizationId) {
      setUsers([]);
      setInvitations([]);
      return;
    }

    if (options.realtime) {
      const unsubUsers = subscribeToAppUsers(currentAppUser.organizationId, setUsers);
      const unsubInvitations = subscribeToUserInvitations(currentAppUser.organizationId, setInvitations);
      return () => {
        unsubUsers();
        unsubInvitations();
      };
    } else {
      const fetchData = async () => {
        const usersData = await getAppUsersByOrganization(currentAppUser.organizationId);
        setUsers(usersData);
      };
      fetchData();
    }
  }, [currentAppUser?.organizationId, options.realtime]);

  // Check if current user has permission
  const hasPermission = useCallback(
    (module: AppModule, requiredLevel: PermissionLevel = 'view'): boolean => {
      if (!currentAppUser) return false;

      const userLevel = currentAppUser.permissions[module];
      const levels: PermissionLevel[] = ['none', 'view', 'edit', 'full'];
      const userLevelIndex = levels.indexOf(userLevel);
      const requiredLevelIndex = levels.indexOf(requiredLevel);

      return userLevelIndex >= requiredLevelIndex;
    },
    [currentAppUser]
  );

  // Check if user can access a module at all
  const canAccess = useCallback(
    (module: AppModule): boolean => hasPermission(module, 'view'),
    [hasPermission]
  );

  // Check if user can edit in a module
  const canEdit = useCallback(
    (module: AppModule): boolean => hasPermission(module, 'edit'),
    [hasPermission]
  );

  // Check if user has full access to a module
  const hasFullAccess = useCallback(
    (module: AppModule): boolean => hasPermission(module, 'full'),
    [hasPermission]
  );

  // Invite a new user
  const inviteUser = async (
    email: string,
    name: string,
    role: UserRole,
    customPermissions?: ModulePermissions
  ): Promise<string | null> => {
    if (!currentAppUser || !organization) {
      toast.error('Not authenticated');
      return null;
    }

    // Check permission to manage users
    if (!hasPermission('user_management', 'edit')) {
      toast.error('You do not have permission to invite users');
      return null;
    }

    // Owner can only be one
    if (role === 'owner') {
      toast.error('Cannot invite another owner');
      return null;
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      toast.error('User already exists in this organization');
      return null;
    }

    // Check for pending invitation
    const existingInvite = invitations.find(
      i => i.email.toLowerCase() === email.toLowerCase() && i.status === 'pending'
    );
    if (existingInvite) {
      toast.error('Pending invitation already exists for this email');
      return null;
    }

    try {
      const permissions = customPermissions || DEFAULT_ROLE_PERMISSIONS[role];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const id = await createUserInvitation({
        organizationId: organization.id,
        email: email.toLowerCase(),
        role,
        permissions,
        invitedBy: currentAppUser.id,
        invitedByName: currentAppUser.name,
        status: 'pending',
        expiresAt,
      });

      toast.success(`Invitation sent to ${email}`);
      return id;
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invitation');
      return null;
    }
  };

  // Add user directly - creates in both Firebase Auth and Firestore
  const addUser = async (
    email: string,
    name: string,
    role: UserRole,
    customPermissions?: ModulePermissions
  ): Promise<string | null> => {
    if (!currentAppUser || !organization) {
      toast.error('Not authenticated');
      return null;
    }

    if (!hasPermission('user_management', 'edit')) {
      toast.error('You do not have permission to add users');
      return null;
    }

    if (role === 'owner') {
      toast.error('Cannot add another owner');
      return null;
    }

    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      toast.error('User already exists');
      return null;
    }

    try {
      const permissions = customPermissions || DEFAULT_ROLE_PERMISSIONS[role];

      // Use Cloud Function to create user in both Firebase Auth and Firestore
      const result = await createUserWithAuth({
        email: email.toLowerCase(),
        name,
        role,
        organizationId: organization.id,
        permissions,
        invitedBy: currentAppUser.id,
      });

      if (result.success) {
        toast.success(`User ${name} created! Password reset link generated.`);
        // Copy reset link to clipboard
        if (result.resetLink) {
          try {
            await navigator.clipboard.writeText(result.resetLink);
            toast.success('Password reset link copied to clipboard');
          } catch {
            console.log('Reset link:', result.resetLink);
          }
        }
        return result.appUserId;
      } else {
        toast.error('Failed to create user');
        return null;
      }
    } catch (err: any) {
      // Handle specific error cases
      if (err.code === 'functions/already-exists') {
        toast.error('A user with this email already exists');
      } else if (err.code === 'functions/permission-denied') {
        toast.error('You do not have permission to create users');
      } else {
        toast.error(err.message || 'Failed to add user');
      }
      return null;
    }
  };

  // Update user
  const editUser = async (
    userId: string,
    data: Partial<Pick<AppUser, 'name' | 'role' | 'permissions' | 'isActive'>>
  ): Promise<boolean> => {
    if (!currentAppUser) {
      toast.error('Not authenticated');
      return false;
    }

    if (!hasPermission('user_management', 'edit')) {
      toast.error('You do not have permission to edit users');
      return false;
    }

    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      toast.error('User not found');
      return false;
    }

    // Cannot change owner role
    if (targetUser.role === 'owner' && data.role && data.role !== 'owner') {
      toast.error('Cannot change owner role');
      return false;
    }

    // Cannot make someone else owner
    if (data.role === 'owner') {
      toast.error('Cannot assign owner role');
      return false;
    }

    try {
      await updateAppUser(userId, data);
      toast.success('User updated successfully');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user');
      return false;
    }
  };

  // Remove user - deletes from both Firebase Auth and Firestore
  const removeUser = async (userId: string): Promise<boolean> => {
    if (!currentAppUser) {
      toast.error('Not authenticated');
      return false;
    }

    if (!hasPermission('user_management', 'full')) {
      toast.error('You do not have permission to remove users');
      return false;
    }

    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      toast.error('User not found');
      return false;
    }

    if (targetUser.role === 'owner') {
      toast.error('Cannot remove the owner');
      return false;
    }

    if (targetUser.id === currentAppUser.id) {
      toast.error('Cannot remove yourself');
      return false;
    }

    try {
      // Delete from Firebase Auth via Cloud Function
      await deleteUserFromAuth(targetUser.email);

      // Delete from Firestore
      await deleteAppUserFromFirestore(userId);

      toast.success('User removed successfully');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove user');
      return false;
    }
  };

  // Revoke invitation
  const revokeInvitation = async (invitationId: string): Promise<boolean> => {
    if (!hasPermission('user_management', 'edit')) {
      toast.error('You do not have permission to revoke invitations');
      return false;
    }

    try {
      await updateUserInvitation(invitationId, { status: 'revoked' });
      toast.success('Invitation revoked');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke invitation');
      return false;
    }
  };

  // Resend invitation
  const resendInvitation = async (invitationId: string): Promise<boolean> => {
    if (!hasPermission('user_management', 'edit')) {
      toast.error('You do not have permission to resend invitations');
      return false;
    }

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await updateUserInvitation(invitationId, { status: 'pending', expiresAt });
      toast.success('Invitation resent');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend invitation');
      return false;
    }
  };

  // Update organization name
  const updateOrgName = async (name: string): Promise<boolean> => {
    if (!organization) return false;

    if (!hasPermission('user_management', 'full')) {
      toast.error('You do not have permission to update organization');
      return false;
    }

    try {
      await updateOrganization(organization.id, { name });
      setOrganization({ ...organization, name });
      toast.success('Organization name updated');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update organization');
      return false;
    }
  };

  // Metrics
  const metrics = useMemo(() => ({
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive).length,
    pendingInvitations: invitations.filter(i => i.status === 'pending').length,
    byRole: {
      owner: users.filter(u => u.role === 'owner').length,
      admin: users.filter(u => u.role === 'admin').length,
      manager: users.filter(u => u.role === 'manager').length,
      employee: users.filter(u => u.role === 'employee').length,
      viewer: users.filter(u => u.role === 'viewer').length,
    },
  }), [users, invitations]);

  return {
    currentAppUser,
    organization,
    users,
    invitations,
    loading,
    error,
    metrics,
    // Permission helpers
    hasPermission,
    canAccess,
    canEdit,
    hasFullAccess,
    // Actions
    inviteUser,
    addUser,
    editUser,
    removeUser,
    revokeInvitation,
    resendInvitation,
    updateOrgName,
  };
}

// Export role and module info for use in components
export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: 'Full access to all features and settings. Can manage users and billing.',
  admin: 'Full access to most features. Can manage users but not billing.',
  manager: 'Can manage contractors, recruitment, and CRM. Limited financial access.',
  employee: 'Can work with contractors, recruitment, and CRM. View-only for most data.',
  viewer: 'Read-only access to dashboards and reports.',
};

export const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  none: 'No Access',
  view: 'View Only',
  edit: 'Can Edit',
  full: 'Full Access',
};

export { MODULE_INFO, DEFAULT_ROLE_PERMISSIONS };
