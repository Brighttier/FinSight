import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  Users,
  Plus,
  Loader2,
  X,
  Shield,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  UserPlus,
  Building2,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  Edit3,
  Lock,
} from 'lucide-react';
import {
  useUserManagement,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  PERMISSION_LABELS,
  MODULE_INFO,
  DEFAULT_ROLE_PERMISSIONS,
} from '../hooks/useUserManagement';
import type { UserRole, AppModule, PermissionLevel, ModulePermissions } from '../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ROLES: UserRole[] = ['admin', 'manager', 'employee', 'viewer'];
const MODULES: AppModule[] = [
  'dashboard',
  'pnl',
  'transactions',
  'subscriptions',
  'contractors',
  'team_payroll',
  'recruitment',
  'crm',
  'profit_share',
  'forecast',
  'settings',
  'user_management',
];

const UserManagement = () => {
  const {
    currentAppUser,
    organization,
    users,
    invitations,
    loading,
    metrics,
    hasPermission,
    canEdit,
    addUser,
    editUser,
    removeUser,
    revokeInvitation,
    resendInvitation,
    updateOrgName,
  } = useUserManagement({ realtime: true });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [editingOrgName, setEditingOrgName] = useState(false);
  const [orgName, setOrgName] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'employee' as UserRole,
    useCustomPermissions: false,
    permissions: { ...DEFAULT_ROLE_PERMISSIONS.employee } as ModulePermissions,
  });

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      role: 'employee',
      useCustomPermissions: false,
      permissions: { ...DEFAULT_ROLE_PERMISSIONS.employee },
    });
    setShowAddForm(false);
    setEditingUser(null);
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData((prev) => ({
      ...prev,
      role,
      permissions: prev.useCustomPermissions ? prev.permissions : { ...DEFAULT_ROLE_PERMISSIONS[role] },
    }));
  };

  const handlePermissionChange = (module: AppModule, level: PermissionLevel) => {
    setFormData((prev) => ({
      ...prev,
      useCustomPermissions: true,
      permissions: { ...prev.permissions, [module]: level },
    }));
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.name.trim()) {
      toast.error('Please fill in email and name');
      return;
    }

    setFormLoading(true);
    const id = await addUser(
      formData.email.trim(),
      formData.name.trim(),
      formData.role,
      formData.useCustomPermissions ? formData.permissions : undefined
    );
    setFormLoading(false);

    if (id) {
      resetForm();
    }
  };

  const handleEditUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    setFormLoading(true);
    const success = await editUser(userId, {
      name: formData.name,
      role: formData.role,
      permissions: formData.permissions,
    });
    setFormLoading(false);

    if (success) {
      resetForm();
    }
  };

  const startEditing = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
      useCustomPermissions: true,
      permissions: { ...user.permissions },
    });
    setEditingUser(userId);
    setShowAddForm(true);
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${userName}?`)) return;
    await removeUser(userId);
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    await editUser(userId, { isActive: !isActive });
  };

  const handleUpdateOrgName = async () => {
    if (!orgName.trim()) {
      toast.error('Please enter a name');
      return;
    }
    const success = await updateOrgName(orgName.trim());
    if (success) {
      setEditingOrgName(false);
    }
  };

  const getPermissionIcon = (level: PermissionLevel) => {
    switch (level) {
      case 'full':
        return <Shield size={14} className="text-emerald-500" />;
      case 'edit':
        return <Edit3 size={14} className="text-blue-500" />;
      case 'view':
        return <Eye size={14} className="text-amber-500" />;
      default:
        return <Lock size={14} className="text-slate-400" />;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700';
      case 'admin':
        return 'bg-indigo-100 text-indigo-700';
      case 'manager':
        return 'bg-blue-100 text-blue-700';
      case 'employee':
        return 'bg-emerald-100 text-emerald-700';
      case 'viewer':
        return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!currentAppUser || !organization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-500">Unable to load user management</p>
      </div>
    );
  }

  const canManageUsers = canEdit('user_management');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h2>
          <p className="text-slate-500 text-sm mt-1">
            Manage team members and their access permissions
          </p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            <UserPlus size={16} />
            Add User
          </button>
        )}
      </div>

      {/* Organization Card */}
      <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Building2 className="h-8 w-8" />
              </div>
              <div>
                {editingOrgName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="px-2 py-1 rounded text-slate-900 text-lg font-bold"
                      autoFocus
                    />
                    <button
                      onClick={handleUpdateOrgName}
                      className="p-1 bg-white/20 rounded hover:bg-white/30"
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button
                      onClick={() => setEditingOrgName(false)}
                      className="p-1 bg-white/20 rounded hover:bg-white/30"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold">{organization.name}</h3>
                    {hasPermission('user_management', 'full') && (
                      <button
                        onClick={() => {
                          setOrgName(organization.name);
                          setEditingOrgName(true);
                        }}
                        className="p-1 bg-white/20 rounded hover:bg-white/30"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                )}
                <p className="text-indigo-200 text-sm">
                  {metrics.totalUsers} team member{metrics.totalUsers !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="px-4">
                <p className="text-2xl font-bold">{metrics.byRole.admin}</p>
                <p className="text-xs text-indigo-200">Admins</p>
              </div>
              <div className="px-4">
                <p className="text-2xl font-bold">{metrics.byRole.manager}</p>
                <p className="text-xs text-indigo-200">Managers</p>
              </div>
              <div className="px-4">
                <p className="text-2xl font-bold">{metrics.byRole.employee}</p>
                <p className="text-xs text-indigo-200">Employees</p>
              </div>
              <div className="px-4">
                <p className="text-2xl font-bold">{metrics.pendingInvitations}</p>
                <p className="text-xs text-indigo-200">Pending</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit User Form */}
      {showAddForm && canManageUsers && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-lg">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editingUser ? (e) => { e.preventDefault(); handleEditUser(editingUser); } : handleAddUser}>
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                    placeholder="user@example.com"
                    disabled={!!editingUser}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">{ROLE_DESCRIPTIONS[formData.role]}</p>
                </div>
              </div>

              {/* Permissions Grid */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Module Permissions</label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.useCustomPermissions}
                      onChange={(e) => {
                        if (!e.target.checked) {
                          setFormData((prev) => ({
                            ...prev,
                            useCustomPermissions: false,
                            permissions: { ...DEFAULT_ROLE_PERMISSIONS[prev.role] },
                          }));
                        } else {
                          setFormData((prev) => ({ ...prev, useCustomPermissions: true }));
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Customize permissions
                  </label>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-slate-600">Module</th>
                        <th className="px-2 py-2 text-center font-medium text-slate-600">No Access</th>
                        <th className="px-2 py-2 text-center font-medium text-slate-600">View</th>
                        <th className="px-2 py-2 text-center font-medium text-slate-600">Edit</th>
                        <th className="px-2 py-2 text-center font-medium text-slate-600">Full</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {MODULES.map((module) => (
                        <tr key={module} className="hover:bg-slate-50">
                          <td className="px-4 py-2">
                            <div>
                              <p className="font-medium text-slate-900">{MODULE_INFO[module].label}</p>
                              <p className="text-xs text-slate-500">{MODULE_INFO[module].description}</p>
                            </div>
                          </td>
                          {(['none', 'view', 'edit', 'full'] as PermissionLevel[]).map((level) => (
                            <td key={level} className="px-2 py-2 text-center">
                              <input
                                type="radio"
                                name={`perm-${module}`}
                                checked={formData.permissions[module] === level}
                                onChange={() => handlePermissionChange(module, level)}
                                disabled={!formData.useCustomPermissions}
                                className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 disabled:opacity-50"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="animate-spin h-4 w-4" />}
                  {editingUser ? 'Update User' : 'Add User'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            Team Members ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No team members yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="border rounded-lg overflow-hidden">
                  {/* User Row */}
                  <div
                    className={`flex items-center justify-between p-4 ${
                      !user.isActive ? 'bg-slate-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          user.isActive ? 'bg-indigo-600' : 'bg-slate-400'
                        }`}
                      >
                        {user.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{user.name}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                            {ROLE_LABELS[user.role]}
                          </span>
                          {!user.isActive && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                              Inactive
                            </span>
                          )}
                          {user.id === currentAppUser?.id && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                        title="View permissions"
                      >
                        {expandedUser === user.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>

                      {canManageUsers && user.role !== 'owner' && user.id !== currentAppUser?.id && (
                        <>
                          <button
                            onClick={() => handleToggleActive(user.id, user.isActive)}
                            className={`p-2 rounded ${
                              user.isActive
                                ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {user.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
                          </button>
                          <button
                            onClick={() => startEditing(user.id)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            title="Edit"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleRemoveUser(user.id, user.name)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Remove"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Permissions */}
                  {expandedUser === user.id && (
                    <div className="border-t bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                        Module Permissions
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {MODULES.map((module) => (
                          <div
                            key={module}
                            className="flex items-center gap-2 p-2 bg-white rounded border"
                          >
                            {getPermissionIcon(user.permissions[module])}
                            <div>
                              <p className="text-xs font-medium text-slate-700">{MODULE_INFO[module].label}</p>
                              <p className="text-xs text-slate-500">{PERMISSION_LABELS[user.permissions[module]]}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {user.lastLoginAt && (
                        <p className="text-xs text-slate-500 mt-3">
                          Last login: {format(new Date(user.lastLoginAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.filter((i) => i.status === 'pending').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail size={20} />
              Pending Invitations ({invitations.filter((i) => i.status === 'pending').length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {invitations
                .filter((i) => i.status === 'pending')
                .map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-amber-50 border-amber-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-200 text-amber-700">
                        <Clock size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{invitation.email}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(invitation.role)}`}>
                            {ROLE_LABELS[invitation.role]}
                          </span>
                          <span>Invited by {invitation.invitedByName}</span>
                          {invitation.expiresAt && (
                            <span>
                              Expires {format(new Date(invitation.expiresAt), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {canManageUsers && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => resendInvitation(invitation.id)}
                          className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Resend"
                        >
                          <RefreshCw size={18} />
                        </button>
                        <button
                          onClick={() => revokeInvitation(invitation.id)}
                          className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Revoke"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permission Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={20} />
            Permission Levels
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Lock className="text-slate-400" size={20} />
              <div>
                <p className="font-medium text-slate-900">No Access</p>
                <p className="text-xs text-slate-500">Cannot access this module</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
              <Eye className="text-amber-500" size={20} />
              <div>
                <p className="font-medium text-slate-900">View Only</p>
                <p className="text-xs text-slate-500">Can view but not modify</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Edit3 className="text-blue-500" size={20} />
              <div>
                <p className="font-medium text-slate-900">Can Edit</p>
                <p className="text-xs text-slate-500">Can create and edit items</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
              <Shield className="text-emerald-500" size={20} />
              <div>
                <p className="font-medium text-slate-900">Full Access</p>
                <p className="text-xs text-slate-500">Complete control including delete</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
