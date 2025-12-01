import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '../components/ui/Card';
import { UploadCloud, CheckCircle, Save, Loader2 } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import type { TransactionCategory, TransactionInput } from '../types';
import { format } from 'date-fns';

const categories: { value: TransactionCategory; label: string; group: string }[] = [
  { value: 'revenue', label: 'Revenue / Sales', group: 'Income' },
  { value: 'payroll', label: 'Payroll & Salaries', group: 'Operational' },
  { value: 'contractors', label: 'Contractors / Freelancers', group: 'Operational' },
  { value: 'software', label: 'Software Subscriptions', group: 'Technology' },
  { value: 'marketing', label: 'Marketing & Advertising', group: 'Growth' },
  { value: 'office', label: 'Office Supplies', group: 'General' },
  { value: 'travel', label: 'Travel & Meals', group: 'General' },
  { value: 'utilities', label: 'Utilities & Rent', group: 'Operational' },
  { value: 'legal', label: 'Legal & Professional', group: 'Operational' },
  { value: 'other', label: 'Other / Miscellaneous', group: 'General' },
];

const ManualEntry = () => {
  const navigate = useNavigate();
  const { addTransaction } = useTransactions();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [type, setType] = useState<'revenue' | 'expense'>('expense');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TransactionCategory | ''>('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'posted'>('posted');

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!date) {
      newErrors.date = 'Date is required';
    }

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!category) {
      newErrors.category = 'Please select a category';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length < 3) {
      newErrors.description = 'Description must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setType('expense');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setAmount('');
    setCategory('');
    setDescription('');
    setStatus('posted');
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const transactionData: TransactionInput = {
      date,
      amount: parseFloat(amount),
      category: category as TransactionCategory,
      description: description.trim(),
      type,
      status,
    };

    const id = await addTransaction(transactionData);

    setLoading(false);

    if (id) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        resetForm();
        // Optionally navigate to dashboard
        // navigate('/dashboard');
      }, 2000);
    }
  };

  const handleSaveDraft = async () => {
    if (!description.trim() && !amount) {
      setErrors({ description: 'Add at least a description to save as draft' });
      return;
    }

    setLoading(true);
    setStatus('draft');

    const transactionData: TransactionInput = {
      date: date || format(new Date(), 'yyyy-MM-dd'),
      amount: parseFloat(amount) || 0,
      category: (category as TransactionCategory) || 'other',
      description: description.trim() || 'Draft transaction',
      type,
      status: 'draft',
    };

    const id = await addTransaction(transactionData);

    setLoading(false);

    if (id) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        resetForm();
      }, 2000);
    }
  };

  // Filter categories based on type
  const filteredCategories =
    type === 'revenue'
      ? categories.filter((c) => c.value === 'revenue')
      : categories.filter((c) => c.value !== 'revenue');

  // Group categories for display
  const groupedCategories = filteredCategories.reduce((acc, cat) => {
    if (!acc[cat.group]) {
      acc[cat.group] = [];
    }
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<string, typeof categories>);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">New Transaction</h2>
        <p className="text-slate-500">Record a revenue or expense item manually.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            {/* Transaction Type */}
            <div className="grid grid-cols-2 gap-4">
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="revenue"
                  checked={type === 'revenue'}
                  onChange={() => {
                    setType('revenue');
                    setCategory('revenue');
                  }}
                  className="peer sr-only"
                />
                <div className="rounded-lg border-2 border-slate-200 p-4 hover:bg-slate-50 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 transition-all text-center">
                  <span className="font-semibold text-slate-900 peer-checked:text-emerald-700">
                    Revenue
                  </span>
                </div>
              </label>
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="expense"
                  checked={type === 'expense'}
                  onChange={() => {
                    setType('expense');
                    setCategory('');
                  }}
                  className="peer sr-only"
                />
                <div className="rounded-lg border-2 border-slate-200 p-4 hover:bg-slate-50 peer-checked:border-red-500 peer-checked:bg-red-50 transition-all text-center">
                  <span className="font-semibold text-slate-900 peer-checked:text-red-700">
                    Expense
                  </span>
                </div>
              </label>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.date ? 'border-red-500' : 'border-slate-300'
                  }`}
                  required
                />
                {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`flex h-10 w-full rounded-md border bg-white pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.amount ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="0.00"
                    required
                  />
                </div>
                {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.category ? 'border-red-500' : 'border-slate-300'
                }`}
                required
              >
                <option value="">Select a category...</option>
                {Object.entries(groupedCategories).map(([group, cats]) => (
                  <optgroup key={group} label={group}>
                    {cats.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.description ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="e.g. Annual Zoom Subscription"
                required
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
            </div>

            {/* Receipt Upload - Placeholder */}
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer">
              <UploadCloud className="mx-auto h-10 w-10 text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-900">Click to upload receipt</p>
              <p className="text-xs text-slate-500 mt-1">PDF, JPG, or PNG (max 5MB)</p>
              <p className="text-xs text-slate-400 mt-2">(Coming soon)</p>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-between">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={loading}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className={`inline-flex items-center justify-center rounded-md text-sm font-medium text-white px-4 py-2 min-w-[140px] transition-all
                ${success ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'}
                disabled:opacity-50
              `}
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : success ? (
                <CheckCircle className="mr-2 h-4 w-4" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {loading ? 'Posting...' : success ? 'Posted!' : 'Post Transaction'}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ManualEntry;
