import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Link2, Database, Users, User, Download, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import { useSubscriptions } from '../hooks/useSubscriptions';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user } = useAuth();
  const { transactions } = useTransactions({ realtime: true });
  const { subscriptions } = useSubscriptions({ realtime: true });
  const [exporting, setExporting] = useState(false);

  const handleExportJSON = async () => {
    setExporting(true);

    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          email: user?.email,
          name: user?.name,
        },
        transactions,
        subscriptions,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
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
      // Export transactions as CSV
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
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="font-semibold text-slate-900">{user?.name || 'User'}</div>
                <div className="text-sm text-slate-500">{user?.email}</div>
                <div className="text-xs text-slate-400 mt-1 capitalize">{user?.role || 'Director'}</div>
              </div>
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
          <CardContent className="space-y-4">
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

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={20} /> User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-4">
              Manage partner access and permissions. Invite team members to collaborate.
            </p>
            <button className="text-sm border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50">
              Coming Soon
            </button>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database size={20} /> Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="flex items-center gap-2 w-full text-left text-sm text-indigo-600 hover:text-indigo-700 p-2 hover:bg-indigo-50 rounded disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <Download size={16} />
                )}
                Export Transactions (CSV)
              </button>
              <button
                onClick={handleExportJSON}
                disabled={exporting}
                className="flex items-center gap-2 w-full text-left text-sm text-slate-600 hover:text-slate-700 p-2 hover:bg-slate-50 rounded disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <Download size={16} />
                )}
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
