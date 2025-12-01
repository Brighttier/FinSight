import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { AlertTriangle, Plus, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { useSubscriptions } from '../hooks/useSubscriptions';
import type { SubscriptionInput } from '../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const vendorColors: Record<string, { bg: string; text: string }> = {
  Adobe: { bg: 'bg-red-100', text: 'text-red-600' },
  AWS: { bg: 'bg-orange-100', text: 'text-orange-600' },
  Google: { bg: 'bg-blue-100', text: 'text-blue-600' },
  Microsoft: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  Notion: { bg: 'bg-slate-100', text: 'text-slate-600' },
  Slack: { bg: 'bg-purple-100', text: 'text-purple-600' },
  Figma: { bg: 'bg-pink-100', text: 'text-pink-600' },
  default: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
};

const getVendorColor = (vendor: string) => {
  for (const key of Object.keys(vendorColors)) {
    if (vendor.toLowerCase().includes(key.toLowerCase())) {
      return vendorColors[key];
    }
  }
  return vendorColors.default;
};

const Subscriptions = () => {
  const {
    subscriptions,
    loading,
    metrics,
    addSubscription,
    editSubscription,
    removeSubscription,
  } = useSubscriptions({ realtime: true });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form state
  const [vendor, setVendor] = useState('');
  const [cost, setCost] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [nextBillingDate, setNextBillingDate] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setVendor('');
    setCost('');
    setBillingCycle('monthly');
    setNextBillingDate('');
    setNotes('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendor.trim() || !cost || !nextBillingDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setFormLoading(true);

    const data: SubscriptionInput = {
      vendor: vendor.trim(),
      cost: parseFloat(cost),
      billingCycle,
      nextBillingDate,
      status: 'active',
      notes: notes.trim() || undefined,
    };

    let success = false;
    if (editingId) {
      success = await editSubscription(editingId, data);
    } else {
      const id = await addSubscription(data);
      success = !!id;
    }

    setFormLoading(false);

    if (success) {
      resetForm();
    }
  };

  const handleEdit = (sub: any) => {
    setVendor(sub.vendor);
    setCost(sub.cost.toString());
    setBillingCycle(sub.billingCycle);
    setNextBillingDate(sub.nextBillingDate);
    setNotes(sub.notes || '');
    setEditingId(sub.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, vendor: string) => {
    if (window.confirm(`Are you sure you want to delete ${vendor}?`)) {
      await removeSubscription(id);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Subscriptions</h2>
        <div className="flex items-center gap-4">
          <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-sm text-slate-500">Monthly Run Rate: </span>
            <span className="font-bold text-slate-900">{formatCurrency(metrics.monthlyTotal)}</span>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            <Plus size={16} />
            Add Subscription
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">
                {editingId ? 'Edit Subscription' : 'New Subscription'}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vendor Name *</label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Adobe Creative Cloud"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cost *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Billing Cycle</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'annual')}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Next Billing Date *</label>
                  <input
                    type="date"
                    value={nextBillingDate}
                    onChange={(e) => setNextBillingDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Any additional notes..."
                />
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
                  {editingId ? 'Update' : 'Add'} Subscription
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="text-slate-500">Loading subscriptions...</span>
          </div>
        </div>
      ) : subscriptions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-slate-500">No subscriptions yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Click "Add Subscription" to track your SaaS and vendor costs
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {subscriptions.map((sub) => {
            const colors = getVendorColor(sub.vendor);
            return (
              <Card key={sub.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${colors.bg} ${colors.text}`}
                    >
                      {sub.vendor[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{sub.vendor}</h3>
                      <p className="text-sm text-slate-500">
                        Next billing: {format(new Date(sub.nextBillingDate), 'MMM d, yyyy')} •{' '}
                        {sub.billingCycle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                    {sub.savingsOpportunity && sub.savingsOpportunity > 0 && (
                      <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs font-medium">
                        <AlertTriangle size={12} />
                        Save ${sub.savingsOpportunity}/yr
                      </div>
                    )}

                    {sub.status === 'cancelled' && (
                      <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded">
                        Cancelled
                      </span>
                    )}

                    {sub.status === 'paused' && (
                      <span className="px-2 py-1 bg-amber-100 text-amber-600 text-xs font-medium rounded">
                        Paused
                      </span>
                    )}

                    <div className="text-right min-w-[80px]">
                      <div className="font-bold text-slate-900">{formatCurrency(sub.cost)}</div>
                      <div className="text-xs text-slate-400">
                        /{sub.billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(sub)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id, sub.vendor)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {subscriptions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Active Subscriptions</p>
              <p className="text-2xl font-bold text-slate-900">{metrics.activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Annual Cost</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(metrics.annualTotal)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Potential Savings</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(metrics.potentialSavings)}/yr
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
