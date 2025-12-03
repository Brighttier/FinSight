import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  Link2,
  Database,
  User,
  Download,
  Upload,
  Loader2,
  Lock,
  Mail,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Shield,
  FileSpreadsheet,
  DollarSign,
  Percent,
  Wallet
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useOrganization } from '../hooks/useOrganization';
import {
  updateUserProfile,
  updateUserEmail,
  updateUserPassword,
  deleteUserAccount,
  isGoogleUser,
  getAuthErrorMessage,
} from '../services/authService';
import ImportDataModal from '../components/ImportDataModal';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, signOut } = useAuth();
  const { transactions } = useTransactions({ realtime: true });
  const { subscriptions } = useSubscriptions({ realtime: true });
  const { organization, loading: orgLoading, updateBankBalance, updateRetentionPercentage } = useOrganization();

  // Export state
  const [exporting, setExporting] = useState(false);

  // Financial settings state
  const [editingBankBalance, setEditingBankBalance] = useState(false);
  const [bankBalanceInput, setBankBalanceInput] = useState('');
  const [savingBankBalance, setSavingBankBalance] = useState(false);
  const [editingRetention, setEditingRetention] = useState(false);
  const [retentionInput, setRetentionInput] = useState('');
  const [savingRetention, setSavingRetention] = useState(false);

  // Initialize financial inputs when organization loads
  useEffect(() => {
    if (organization) {
      setBankBalanceInput(organization.bankBalance?.toString() || '');
      setRetentionInput(organization.retentionPercentage?.toString() || '0');
    }
  }, [organization]);

  // Profile editing state
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);

  // Email change state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);

  const googleUser = isGoogleUser();

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: { email: user?.email, name: user?.name },
        transactions,
        subscriptions,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finsight-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (err) {
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Status'];
      const rows = transactions.map((t) => [
        t.date,
        `"${t.description}"`,
        t.category,
        t.type,
        t.amount.toString(),
        t.status,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finsight-transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Transactions exported as CSV');
    } catch (err) {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSavingName(true);
    try {
      await updateUserProfile(newName.trim());
      toast.success('Name updated successfully');
      setEditingName(false);
    } catch (err: any) {
      toast.error(getAuthErrorMessage(err.code) || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !emailPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    setSavingEmail(true);
    try {
      await updateUserEmail(newEmail.trim(), emailPassword);
      toast.success('Email updated successfully');
      setShowEmailForm(false);
      setNewEmail('');
      setEmailPassword('');
    } catch (err: any) {
      toast.error(getAuthErrorMessage(err.code) || 'Failed to update email');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await updateUserPassword(currentPassword, newPassword);
      toast.success('Password updated successfully');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(getAuthErrorMessage(err.code) || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) {
      toast.error('Please enter your password');
      return;
    }
    setDeleting(true);
    try {
      await deleteUserAccount(deletePassword);
      toast.success('Account deleted');
      // User will be automatically signed out
    } catch (err: any) {
      toast.error(getAuthErrorMessage(err.code) || 'Failed to delete account');
      setDeleting(false);
    }
  };

  const handleSaveBankBalance = async () => {
    const amount = parseFloat(bankBalanceInput);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setSavingBankBalance(true);
    const success = await updateBankBalance(amount);
    setSavingBankBalance(false);
    if (success) {
      setEditingBankBalance(false);
    }
  };

  const handleSaveRetention = async () => {
    const percent = parseFloat(retentionInput);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      toast.error('Please enter a valid percentage (0-100)');
      return;
    }
    setSavingRetention(true);
    const success = await updateRetentionPercentage(percent);
    setSavingRetention(false);
    if (success) {
      setEditingRetention(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h2>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Your name"
                      disabled={savingName}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      {savingName ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    </button>
                    <button
                      onClick={() => { setEditingName(false); setNewName(user?.name || ''); }}
                      disabled={savingName}
                      className="p-1 text-slate-400 hover:bg-slate-50 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{user?.name || 'User'}</span>
                    <button
                      onClick={() => setEditingName(true)}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
                <div className="text-sm text-slate-500">{user?.email}</div>
                <div className="text-xs text-slate-400 mt-1 capitalize flex items-center gap-1">
                  {googleUser && <Shield size={12} />}
                  {user?.role || 'Director'}
                  {googleUser && ' (Google Account)'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet size={20} /> Financial Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {orgLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                {/* Bank Balance */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                      <DollarSign size={16} />
                      Bank Balance
                    </div>
                    {!editingBankBalance && (
                      <button
                        onClick={() => setEditingBankBalance(true)}
                        className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                  {editingBankBalance ? (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2 text-slate-500">$</span>
                        <input
                          type="number"
                          value={bankBalanceInput}
                          onChange={(e) => setBankBalanceInput(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 border border-emerald-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="0"
                          disabled={savingBankBalance}
                        />
                      </div>
                      <button
                        onClick={handleSaveBankBalance}
                        disabled={savingBankBalance}
                        className="p-2 text-green-600 hover:bg-green-100 rounded"
                      >
                        {savingBankBalance ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingBankBalance(false);
                          setBankBalanceInput(organization?.bankBalance?.toString() || '');
                        }}
                        disabled={savingBankBalance}
                        className="p-2 text-slate-400 hover:bg-slate-100 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl font-bold text-emerald-700">
                        {organization?.bankBalance !== undefined
                          ? formatCurrency(organization.bankBalance)
                          : 'Not set'}
                      </div>
                      {organization?.lastBankBalanceUpdate && (
                        <div className="text-xs text-emerald-600 mt-1">
                          Last updated: {organization.lastBankBalanceUpdate}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-emerald-600 mt-2">
                    Enter your current bank balance for accurate financial tracking
                  </p>
                </div>

                {/* Retention Percentage */}
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-purple-700 font-medium">
                      <Percent size={16} />
                      Profit Retention
                    </div>
                    {!editingRetention && (
                      <button
                        onClick={() => setEditingRetention(true)}
                        className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                  {editingRetention ? (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={retentionInput}
                          onChange={(e) => setRetentionInput(e.target.value)}
                          className="w-full pr-8 pl-3 py-2 border border-purple-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="0"
                          disabled={savingRetention}
                        />
                        <span className="absolute right-3 top-2 text-slate-500">%</span>
                      </div>
                      <button
                        onClick={handleSaveRetention}
                        disabled={savingRetention}
                        className="p-2 text-green-600 hover:bg-green-100 rounded"
                      >
                        {savingRetention ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingRetention(false);
                          setRetentionInput(organization?.retentionPercentage?.toString() || '0');
                        }}
                        disabled={savingRetention}
                        className="p-2 text-slate-400 hover:bg-slate-100 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl font-bold text-purple-700">
                        {organization?.retentionPercentage ?? 0}%
                      </div>
                      <div className="text-xs text-purple-600 mt-1">
                        {100 - (organization?.retentionPercentage ?? 0)}% available for partner distribution
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-purple-600 mt-2">
                    Percentage of profit to retain for company operations (not distributed to partners)
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Account Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock size={20} /> Account Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {/* Change Email */}
            {!googleUser && (
              <>
                {showEmailForm ? (
                  <form onSubmit={handleUpdateEmail} className="space-y-2 p-3 bg-slate-50 rounded-lg">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="New email address"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={savingEmail}
                    />
                    <input
                      type="password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      placeholder="Current password"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={savingEmail}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={savingEmail}
                        className="flex-1 bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingEmail ? 'Saving...' : 'Update Email'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowEmailForm(false); setNewEmail(''); setEmailPassword(''); }}
                        disabled={savingEmail}
                        className="px-3 py-1.5 border border-slate-300 rounded text-sm hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowEmailForm(true)}
                    className="flex items-center gap-2 w-full text-left text-sm text-slate-600 hover:text-slate-900 p-2 hover:bg-slate-50 rounded"
                  >
                    <Mail size={16} />
                    Change Email Address
                  </button>
                )}

                {/* Change Password */}
                {showPasswordForm ? (
                  <form onSubmit={handleUpdatePassword} className="space-y-2 p-3 bg-slate-50 rounded-lg">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current password"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={savingPassword}
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={savingPassword}
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={savingPassword}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={savingPassword}
                        className="flex-1 bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingPassword ? 'Saving...' : 'Update Password'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        disabled={savingPassword}
                        className="px-3 py-1.5 border border-slate-300 rounded text-sm hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="flex items-center gap-2 w-full text-left text-sm text-slate-600 hover:text-slate-900 p-2 hover:bg-slate-50 rounded"
                  >
                    <Lock size={16} />
                    Change Password
                  </button>
                )}
              </>
            )}

            {googleUser && (
              <p className="text-sm text-slate-500 p-2">
                You signed in with Google. Email and password are managed through your Google account.
              </p>
            )}

            {/* Delete Account */}
            <div className="pt-2 border-t border-slate-100">
              {showDeleteConfirm ? (
                <form onSubmit={handleDeleteAccount} className="space-y-2 p-3 bg-red-50 rounded-lg">
                  <div className="flex items-start gap-2 text-red-700 text-sm">
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>This action cannot be undone. All your data will be permanently deleted.</span>
                  </div>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your password to confirm"
                    className="w-full px-3 py-2 border border-red-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={deleting}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={deleting}
                      className="flex-1 bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Delete My Account'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
                      disabled={deleting}
                      className="px-3 py-1.5 border border-slate-300 rounded text-sm hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 w-full text-left text-sm text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded"
                >
                  <Trash2 size={16} />
                  Delete Account
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Connections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 size={20} /> Data Connections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
              <div>
                <div className="font-medium">Bank Feeds (Plaid)</div>
                <div className="text-xs text-slate-500">Auto-import transactions</div>
              </div>
              <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-800">
                Coming Soon
              </button>
            </div>
            <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
              <div>
                <div className="font-medium">QuickBooks</div>
                <div className="text-xs text-slate-500">Sync accounting data</div>
              </div>
              <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-800">
                Coming Soon
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database size={20} /> Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {/* Import Section */}
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-center gap-2 text-indigo-700 font-medium mb-2">
                <FileSpreadsheet size={16} />
                Bulk Import from Excel
              </div>
              <p className="text-xs text-indigo-600 mb-3">
                Download a template, fill in your data, and upload to import transactions, subscriptions, or partners in bulk.
              </p>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
              >
                <Upload size={14} />
                Import from Excel
              </button>
            </div>

            {/* Export Section */}
            <div className="grid gap-3">
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="flex items-center gap-2 w-full text-left text-sm text-indigo-600 hover:text-indigo-700 p-2 hover:bg-indigo-50 rounded disabled:opacity-50"
              >
                {exporting ? <Loader2 className="animate-spin h-4 w-4" /> : <Download size={16} />}
                Export Transactions (CSV)
              </button>
              <button
                onClick={handleExportJSON}
                disabled={exporting}
                className="flex items-center gap-2 w-full text-left text-sm text-slate-600 hover:text-slate-700 p-2 hover:bg-slate-50 rounded disabled:opacity-50"
              >
                {exporting ? <Loader2 className="animate-spin h-4 w-4" /> : <Download size={16} />}
                Export All Data (JSON)
              </button>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                {transactions.length} transactions • {subscriptions.length} subscriptions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Modal */}
      <ImportDataModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {}}
      />

      {/* App Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>FinSight v1.0.0</span>
            <span>Firebase Project: velo-479115</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
