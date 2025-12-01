import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { AlertTriangle, Plus, Loader2, Pencil, Trash2, X, CreditCard, TrendingUp, Tag } from 'lucide-react';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { autoAssignCategories } from '../services/subscriptionCategoryService';
import type { SubscriptionInput } from '../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const SUBSCRIPTION_CATEGORIES = [
  'Software',
  'Cloud & Infrastructure',
  'Marketing',
  'Communication',
  'Productivity',
  'Design',
  'Development',
  'Analytics',
  'Security',
  'Finance',
  'HR & Payroll',
  'Other',
] as const;

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
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');

  // Auto-assign categories on first load
  const hasAutoAssigned = useRef(false);
  useEffect(() => {
    if (!loading && subscriptions.length > 0 && !hasAutoAssigned.current) {
      hasAutoAssigned.current = true;
      const uncategorized = subscriptions.filter((s) => !s.category);
      if (uncategorized.length > 0) {
        autoAssignCategories(subscriptions).then((count) => {
          if (count > 0) {
            toast.success(`Auto-assigned categories to ${count} subscription${count > 1 ? 's' : ''}`);
          }
        });
      }
    }
  }, [loading, subscriptions]);

  // Calculate spending by category
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; monthly: number }> = {};

    subscriptions
      .filter((s) => s.status === 'active')
      .forEach((sub) => {
        const cat = sub.category || 'Uncategorized';
        if (!breakdown[cat]) {
          breakdown[cat] = { count: 0, monthly: 0 };
        }
        breakdown[cat].count++;
        // Convert annual to monthly for consistent display
        const monthlyAmount = sub.billingCycle === 'annual' ? sub.cost / 12 : sub.cost;
        breakdown[cat].monthly += monthlyAmount;
      });

    // Sort by monthly spend descending
    return Object.entries(breakdown)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.monthly - a.monthly);
  }, [subscriptions]);

  const resetForm = () => {
    setVendor('');
    setCost('');
    setBillingCycle('monthly');
    setNextBillingDate('');
    setCategory('');
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
      category: category || undefined,
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
    setCategory(sub.category || '');
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
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus size={16} />
          Add Subscription
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <CreditCard className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active Subscriptions</p>
                <p className="text-2xl font-bold text-indigo-700">{metrics.activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Monthly Run Rate</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(metrics.monthlyTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Tag className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Annual Cost</p>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(metrics.annualTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Spending by Category</h3>
            <div className="flex flex-wrap gap-3">
              {categoryBreakdown.map(({ category, count, monthly }) => (
                <div
                  key={category}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <span className="text-sm font-medium text-slate-700">{category}</span>
                  <span className="text-xs text-slate-500">({count})</span>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(monthly)}/mo</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              <div className="grid gap-4 md:grid-cols-3">
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
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select category...</option>
                    {SUBSCRIPTION_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{sub.vendor}</h3>
                        {sub.category && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                            {sub.category}
                          </span>
                        )}
                      </div>
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
    </div>
  );
};

export default Subscriptions;
