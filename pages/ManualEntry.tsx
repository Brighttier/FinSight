import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { UploadCloud, CheckCircle, Save, Loader2, Trash2, Edit2, X, Plus, ArrowUpCircle, ArrowDownCircle, Search } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import type { TransactionCategory, TransactionInput, Transaction, PaymentStatus, PaymentTerms } from '../types';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

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
  { value: 'taxes', label: 'Taxes', group: 'Operational' },
  { value: 'reimbursements', label: 'Reimbursements', group: 'General' },
  { value: 'other', label: 'Other / Miscellaneous', group: 'General' },
];

type DateFilter = 'all' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'custom';
type TypeFilter = 'all' | 'revenue' | 'expense';

const ManualEntry = () => {
  const { transactions, loading: transactionsLoading, addTransaction, editTransaction, removeTransaction } = useTransactions({ realtime: true });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Form state
  const [type, setType] = useState<'revenue' | 'expense'>('expense');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TransactionCategory | ''>('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'posted'>('posted');

  // Invoice tracking fields (for revenue)
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');

  // Payment tracking fields (for cash flow)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms | ''>('');

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

    // Invoice number is required for revenue transactions
    if (type === 'revenue' && !invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'Invoice number is required for revenue';
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
    setInvoiceNumber('');
    setInvoiceDate('');
    setPaymentStatus('paid');
    setPaymentDate('');
    setPaymentTerms('');
    setErrors({});
    setEditingId(null);
  };

  const startEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setType(transaction.type);
    setDate(transaction.date.split('T')[0]);
    setAmount(transaction.amount.toString());
    setCategory(transaction.category);
    setDescription(transaction.description);
    setStatus(transaction.status);
    setInvoiceNumber(transaction.invoiceNumber || '');
    setInvoiceDate(transaction.invoiceDate?.split('T')[0] || '');
    setPaymentStatus(transaction.paymentStatus || 'paid');
    setPaymentDate(transaction.paymentDate?.split('T')[0] || '');
    setPaymentTerms(transaction.paymentTerms || '');
    setShowForm(true);
    setErrors({});
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const success = await removeTransaction(id);
    setDeletingId(null);
    if (success) {
      toast.success('Transaction deleted');
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

  const getCategoryLabel = (cat: TransactionCategory) => {
    const found = categories.find(c => c.value === cat);
    return found ? found.label : cat;
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
      // Invoice tracking fields (for revenue)
      invoiceNumber: type === 'revenue' ? invoiceNumber.trim() : undefined,
      invoiceDate: type === 'revenue' ? (invoiceDate || date) : undefined,
      // Payment tracking fields for cash flow
      paymentStatus,
      paymentDate: paymentStatus === 'paid' ? (paymentDate || date) : undefined,
      paymentTerms: paymentTerms || undefined,
    };

    let success = false;
    if (editingId) {
      // Update existing transaction
      success = await editTransaction(editingId, transactionData);
    } else {
      // Add new transaction
      const id = await addTransaction(transactionData);
      success = !!id;
    }

    setLoading(false);

    if (success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        resetForm();
        setShowForm(false);
      }, 1500);
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

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      let endDate = now;

      switch (dateFilter) {
        case 'thisMonth':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'lastMonth':
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        case 'last3Months':
          startDate = startOfMonth(subMonths(now, 2));
          endDate = endOfMonth(now);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(t => {
        const txDate = parseISO(t.date.split('T')[0]);
        return isWithinInterval(txDate, { start: startDate, end: endDate });
      });
    }

    // Sort by date (most recent first)
    return filtered.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [transactions, searchQuery, typeFilter, categoryFilter, dateFilter]);

  // Calculate running balance and totals
  const { totalRevenue, totalExpenses, netAmount } = useMemo(() => {
    let revenue = 0;
    let expenses = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'revenue') {
        revenue += t.amount;
      } else {
        expenses += t.amount;
      }
    });
    return {
      totalRevenue: revenue,
      totalExpenses: expenses,
      netAmount: revenue - expenses,
    };
  }, [filteredTransactions]);

  // Get unique categories from transactions
  const uniqueCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">All Transactions</h2>
          <p className="text-slate-500">View and manage all revenue and expense entries.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} />
            New Transaction
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-emerald-600 font-medium">Total Revenue</p>
            <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-emerald-500 mt-1">{filteredTransactions.filter(t => t.type === 'revenue').length} transactions</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-red-600 font-medium">Total Expenses</p>
            <p className="text-2xl font-bold text-red-700">{formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-red-500 mt-1">{filteredTransactions.filter(t => t.type === 'expense').length} transactions</p>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${netAmount >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-amber-50 to-amber-100 border-amber-200'}`}>
          <CardContent className="pt-4 pb-4">
            <p className={`text-sm font-medium ${netAmount >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>Net Amount</p>
            <p className={`text-2xl font-bold ${netAmount >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
              {netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount)}
            </p>
            <p className={`text-xs mt-1 ${netAmount >= 0 ? 'text-blue-500' : 'text-amber-500'}`}>
              {filteredTransactions.length} total transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Form */}
      {showForm && (
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

            {/* Invoice Tracking Section (Revenue only) */}
            {type === 'revenue' && (
              <div className="border-t border-slate-200 pt-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-4">Invoice Details</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Invoice Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.invoiceNumber ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="e.g. INV-2024-001"
                    />
                    {errors.invoiceNumber && <p className="text-xs text-red-500">{errors.invoiceNumber}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Invoice Date</label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-slate-400">Leave blank to use transaction date</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Tracking Section */}
            <div className="border-t border-slate-200 pt-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-4">Payment Tracking (Cash Flow)</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                  <p className="text-xs text-slate-400">
                    {type === 'revenue' ? 'Has customer paid?' : 'Has vendor been paid?'}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select terms...</option>
                    <option value="immediate">Immediate</option>
                    <option value="net_15">Net 15</option>
                    <option value="net_30">Net 30</option>
                    <option value="net_45">Net 45</option>
                    <option value="net_60">Net 60</option>
                    <option value="net_90">Net 90</option>
                  </select>
                </div>

                {paymentStatus === 'paid' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Date</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="When was payment received?"
                    />
                    <p className="text-xs text-slate-400">Leave blank to use transaction date</p>
                  </div>
                )}
              </div>
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                disabled={loading}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 disabled:opacity-50"
              >
                Cancel
              </button>
              {!editingId && (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={loading}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 disabled:opacity-50"
                >
                  Save Draft
                </button>
              )}
            </div>
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
              {loading ? (editingId ? 'Updating...' : 'Posting...') : success ? (editingId ? 'Updated!' : 'Posted!') : (editingId ? 'Update Transaction' : 'Post Transaction')}
            </button>
          </CardFooter>
        </form>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Time</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="last3Months">Last 3 Months</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Types</option>
              <option value="revenue">Revenue Only</option>
              <option value="expense">Expenses Only</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{getCategoryLabel(cat as TransactionCategory)}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table - Bank Statement Style */}
      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center justify-between">
            <span>Transaction History</span>
            <span className="text-sm font-normal text-slate-500">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No transactions found</p>
              <p className="text-sm text-slate-400 mt-1">
                {transactions.length === 0
                  ? 'Click "New Transaction" to add your first entry'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Category</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-center font-medium w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        transaction.status === 'draft' ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {format(new Date(transaction.date), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-slate-400">
                          {format(new Date(transaction.date), 'EEEE')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-1.5 rounded-full flex-shrink-0 ${
                              transaction.type === 'revenue'
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-red-100 text-red-600'
                            }`}
                          >
                            {transaction.type === 'revenue' ? (
                              <ArrowUpCircle size={16} />
                            ) : (
                              <ArrowDownCircle size={16} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">
                              {transaction.description}
                            </p>
                            <p className="text-xs text-slate-500 md:hidden">
                              {getCategoryLabel(transaction.category)}
                            </p>
                            {transaction.status === 'draft' && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                                Draft
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="inline-flex px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">
                          {getCategoryLabel(transaction.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            transaction.type === 'revenue' ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {transaction.type === 'revenue' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => startEdit(transaction)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(transaction.id)}
                            disabled={deletingId === transaction.id}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === transaction.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualEntry;
