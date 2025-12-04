import React, { useState, useRef } from 'react';
import { X, Loader2, CheckCircle, ArrowUpCircle, ArrowDownCircle, UploadCloud, FileText, Image, Trash2 } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { useAuth } from '../contexts/AuthContext';
import { uploadReceipt, validateReceiptFile } from '../services/storageService';
import type { TransactionCategory, TransactionInput, PaymentStatus, PaymentTerms } from '../types';
import { format } from 'date-fns';
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

interface QuickAddTransactionProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickAddTransaction: React.FC<QuickAddTransactionProps> = ({ isOpen, onClose }) => {
  const { addTransaction } = useTransactions({ realtime: true });
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [type, setType] = useState<'revenue' | 'expense'>('expense');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TransactionCategory | ''>('');
  const [description, setDescription] = useState('');

  // Payment tracking state (for cash flow)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms | ''>('');

  // Receipt state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

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
    setPaymentStatus('paid');
    setPaymentDate('');
    setPaymentTerms('');
    setReceiptFile(null);
    setErrors({});
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateReceiptFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }

    setReceiptFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validation = validateReceiptFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }

    setReceiptFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!user?.uid) {
      toast.error('You must be logged in');
      return;
    }

    setLoading(true);

    let receiptUrl: string | undefined;

    // Upload receipt if present
    if (receiptFile) {
      try {
        setUploadingReceipt(true);
        const result = await uploadReceipt(user.uid, receiptFile);
        receiptUrl = result.url;
      } catch (err) {
        console.error('Failed to upload receipt:', err);
        toast.error('Failed to upload receipt');
        setLoading(false);
        setUploadingReceipt(false);
        return;
      }
      setUploadingReceipt(false);
    }

    const transactionData: TransactionInput = {
      date,
      amount: parseFloat(amount),
      category: category as TransactionCategory,
      description: description.trim(),
      type,
      status: 'posted',
      receiptUrl,
      // Payment tracking fields for cash flow
      paymentStatus,
      paymentDate: paymentStatus === 'paid' ? (paymentDate || date) : undefined,
      paymentTerms: paymentTerms || undefined,
    };

    const id = await addTransaction(transactionData);
    setLoading(false);

    if (id) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        resetForm();
        onClose();
      }, 1000);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Filter categories based on type
  const filteredCategories = type === 'revenue'
    ? categories.filter(c => c.value === 'revenue' || c.value === 'other')
    : categories.filter(c => c.value !== 'revenue');

  // Group categories for the dropdown
  const groupedCategories = filteredCategories.reduce((acc, cat) => {
    if (!acc[cat.group]) {
      acc[cat.group] = [];
    }
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<string, typeof categories>);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Quick Add Transaction</h3>
            <button
              onClick={handleClose}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="p-5 space-y-4">
              {/* Transaction Type Toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setType('expense');
                    setCategory('');
                  }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
                    type === 'expense'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <ArrowDownCircle size={18} />
                  <span className="font-medium">Expense</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('revenue');
                    setCategory('');
                  }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
                    type === 'revenue'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <ArrowUpCircle size={18} />
                  <span className="font-medium">Revenue</span>
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-medium">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full pl-8 pr-4 py-2.5 border rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 ${
                      errors.amount
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-slate-200 focus:ring-indigo-500'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && (
                  <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
                )}
              </div>

              {/* Date and Category Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.date
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-slate-200 focus:ring-indigo-500'
                    }`}
                  />
                  {errors.date && (
                    <p className="text-red-500 text-xs mt-1">{errors.date}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white ${
                      errors.category
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-slate-200 focus:ring-indigo-500'
                    }`}
                  >
                    <option value="">Select...</option>
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
                  {errors.category && (
                    <p className="text-red-500 text-xs mt-1">{errors.category}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.description
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-slate-200 focus:ring-indigo-500'
                  }`}
                  placeholder="e.g., Office supplies from Amazon"
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                )}
              </div>

              {/* Payment Tracking (Collapsible) */}
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-800 py-2 border-t border-slate-100">
                  <span>Payment Tracking (Cash Flow)</span>
                  <span className="text-xs text-slate-400 group-open:hidden">Click to expand</span>
                </summary>
                <div className="pt-3 pb-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Payment Status
                      </label>
                      <select
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="unpaid">Unpaid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Payment Terms
                      </label>
                      <select
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">Select...</option>
                        <option value="immediate">Immediate</option>
                        <option value="net_15">Net 15</option>
                        <option value="net_30">Net 30</option>
                        <option value="net_45">Net 45</option>
                        <option value="net_60">Net 60</option>
                        <option value="net_90">Net 90</option>
                      </select>
                    </div>
                  </div>
                  {paymentStatus === 'paid' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Payment Date <span className="text-slate-400">(blank = transaction date)</span>
                      </label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                  <p className="text-xs text-slate-400">
                    {type === 'revenue'
                      ? 'Track when customer pays for accurate cash flow reporting'
                      : 'Track when payment is made for accurate cash flow reporting'}
                  </p>
                </div>
              </details>

              {/* Receipt Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Receipt <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {receiptFile ? (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                      {receiptFile.type.startsWith('image/') ? (
                        <Image size={20} />
                      ) : (
                        <FileText size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {receiptFile.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(receiptFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReceiptFile(null)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
                  >
                    <UploadCloud className="mx-auto h-8 w-8 text-slate-400 mb-1" />
                    <p className="text-sm text-slate-600">
                      Click or drag to upload
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      PDF, JPG, PNG (max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 bg-slate-50 border-t border-slate-100 rounded-b-xl">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || success}
                className={`inline-flex items-center justify-center px-5 py-2 rounded-lg text-sm font-medium text-white transition-all min-w-[120px] ${
                  success
                    ? 'bg-emerald-600'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } disabled:opacity-70`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    {uploadingReceipt ? 'Uploading...' : 'Adding...'}
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Added!
                  </>
                ) : (
                  'Add Transaction'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default QuickAddTransaction;
