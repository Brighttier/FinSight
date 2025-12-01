import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Loader2, Pencil, Trash2, X, DollarSign } from 'lucide-react';
import { usePartners } from '../hooks/usePartners';
import { usePnL } from '../hooks/useTransactions';
import type { PartnerInput } from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

const ProfitShare = () => {
  // Get current month P&L for profit pool
  const now = new Date();
  const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd');
  const { profit, loading: pnlLoading } = usePnL(startDate, endDate);

  const {
    partners,
    distributions,
    loading: partnersLoading,
    metrics,
    addPartner,
    editPartner,
    removePartner,
    distributeProfit,
  } = usePartners({ realtime: true });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [distributing, setDistributing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [sharePercentage, setSharePercentage] = useState('');

  const loading = pnlLoading || partnersLoading;
  const poolAmount = Math.max(0, profit);

  // Calculate partner amounts
  const partnersWithAmounts = useMemo(() => {
    return partners
      .filter((p) => p.status === 'active')
      .map((p, index) => ({
        ...p,
        amount: (poolAmount * p.sharePercentage) / 100,
        color: COLORS[index % COLORS.length],
      }));
  }, [partners, poolAmount]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setRole('');
    setSharePercentage('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !sharePercentage) {
      toast.error('Please fill in name and share percentage');
      return;
    }

    const share = parseFloat(sharePercentage);
    if (share <= 0 || share > 100) {
      toast.error('Share percentage must be between 0 and 100');
      return;
    }

    setFormLoading(true);

    const data: PartnerInput = {
      name: name.trim(),
      email: email.trim(),
      role: role.trim() || 'Partner',
      sharePercentage: share,
      status: 'active',
    };

    let success = false;
    if (editingId) {
      success = await editPartner(editingId, data);
    } else {
      const id = await addPartner(data);
      success = !!id;
    }

    setFormLoading(false);

    if (success) {
      resetForm();
    }
  };

  const handleEdit = (partner: any) => {
    setName(partner.name);
    setEmail(partner.email || '');
    setRole(partner.role);
    setSharePercentage(partner.sharePercentage.toString());
    setEditingId(partner.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name}?`)) {
      await removePartner(id);
    }
  };

  const handleDistribute = async () => {
    if (poolAmount <= 0) {
      toast.error('No profit available to distribute');
      return;
    }

    if (metrics.totalShareAllocated !== 100) {
      toast.error(`Partner shares must total 100% (currently ${metrics.totalShareAllocated}%)`);
      return;
    }

    if (window.confirm(`Distribute $${poolAmount.toLocaleString()} among ${metrics.activePartners} partners?`)) {
      setDistributing(true);
      await distributeProfit(poolAmount);
      setDistributing(false);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Profit Distribution ({format(now, 'MMM yyyy')})
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus size={16} />
          Add Partner
        </button>
      </div>

      {/* Add/Edit Partner Form */}
      {showForm && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">
                {editingId ? 'Edit Partner' : 'New Partner'}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Partner name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="partner@example.com"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Co-founder, Director"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Share Percentage * (Remaining: {metrics.remainingShare}%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max={editingId ? 100 : metrics.remainingShare}
                      value={sharePercentage}
                      onChange={(e) => setSharePercentage(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-slate-500">%</span>
                  </div>
                </div>
              </div>
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
                  {editingId ? 'Update' : 'Add'} Partner
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="text-slate-500">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-indigo-900 text-white border-none">
              <CardHeader>
                <CardTitle className="text-indigo-200">Total Available Pool</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-bold mb-4">{formatCurrency(poolAmount)}</div>
                <p className="text-indigo-200 text-sm">
                  {poolAmount > 0
                    ? `Calculated from Net Profit (${format(now, 'MMMM yyyy')})`
                    : 'No profit available this period'}
                </p>
                {partnersWithAmounts.length > 0 && metrics.totalShareAllocated === 100 && (
                  <button
                    onClick={handleDistribute}
                    disabled={distributing || poolAmount <= 0}
                    className="mt-6 inline-flex items-center gap-2 bg-white text-indigo-900 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-50 transition-colors disabled:opacity-50"
                  >
                    {distributing ? (
                      <Loader2 className="animate-spin h-4 w-4" />
                    ) : (
                      <DollarSign size={16} />
                    )}
                    {distributing ? 'Processing...' : 'Distribute Funds'}
                  </button>
                )}
                {metrics.totalShareAllocated !== 100 && metrics.activePartners > 0 && (
                  <p className="mt-4 text-amber-300 text-sm">
                    Partner shares must total 100% to distribute (currently {metrics.totalShareAllocated}%)
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Share Allocation</CardTitle>
              </CardHeader>
              <CardContent className="h-[200px]">
                {partnersWithAmounts.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-slate-500">Add partners to see allocation</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={partnersWithAmounts}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="sharePercentage"
                        nameKey="name"
                      >
                        {partnersWithAmounts.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`${value}%`, 'Share']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Distribution Table</CardTitle>
            </CardHeader>
            <CardContent>
              {partnersWithAmounts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500">No partners added yet</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Add partners to set up profit distribution
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Partner</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Share %</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right rounded-r-lg">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {partnersWithAmounts.map((partner) => (
                      <tr key={partner.id}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                              style={{ backgroundColor: partner.color }}
                            >
                              {partner.name[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{partner.name}</div>
                              {partner.email && (
                                <div className="text-xs text-slate-500">{partner.email}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{partner.role}</td>
                        <td className="px-4 py-3 text-slate-900 font-medium">
                          {partner.sharePercentage}%
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {formatCurrency(partner.amount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleEdit(partner)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(partner.id, partner.name)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Remove"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-4 py-3" colSpan={2}>
                        Total
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            metrics.totalShareAllocated === 100
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          }
                        >
                          {metrics.totalShareAllocated}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(poolAmount)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Recent Distributions */}
          {distributions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Distributions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {distributions.slice(0, 5).map((dist) => (
                    <div
                      key={dist.id}
                      className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <span className="font-medium text-slate-900">{dist.partnerName}</span>
                        <span className="text-slate-500 text-sm ml-2">
                          {format(new Date(dist.date), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">
                          {formatCurrency(dist.amount)}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            dist.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-amber-100 text-amber-600'
                          }`}
                        >
                          {dist.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ProfitShare;
