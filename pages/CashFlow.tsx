import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  Loader2,
  Download,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  X,
} from 'lucide-react';
import {
  useCashFlowStatement,
  type AgingItem,
} from '../hooks/useCashFlowStatement';
import { useTransactions } from '../hooks/useTransactions';
import { updateTimesheet } from '../services/firestoreService';
import toast from 'react-hot-toast';
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  startOfYear,
  subYears,
} from 'date-fns';

type DateRange = 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisQuarter' | 'lastQuarter' | 'ytd' | 'lastYear';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCurrencyDetailed = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const CashFlow = () => {
  const [dateRange, setDateRange] = useState<DateRange>('thisMonth');
  const [showARDetails, setShowARDetails] = useState(false);
  const [showAPDetails, setShowAPDetails] = useState(false);

  // Mark as Paid modal state
  const [markingPaidItem, setMarkingPaidItem] = useState<AgingItem | null>(null);
  const [markingPaidType, setMarkingPaidType] = useState<'ar' | 'ap' | null>(null);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  // Get editTransaction from useTransactions
  const { editTransaction } = useTransactions({ realtime: false });

  // Calculate date range
  const { startDate, endDate, label } = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'thisMonth':
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
          label: format(now, 'MMMM yyyy'),
        };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return {
          startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
          label: format(lastMonth, 'MMMM yyyy'),
        };
      case 'last3Months':
        const threeMonthsAgo = subMonths(now, 2);
        return {
          startDate: format(startOfMonth(threeMonthsAgo), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
          label: `${format(threeMonthsAgo, 'MMM')} - ${format(now, 'MMM yyyy')}`,
        };
      case 'thisQuarter':
        return {
          startDate: format(startOfQuarter(now), 'yyyy-MM-dd'),
          endDate: format(endOfQuarter(now), 'yyyy-MM-dd'),
          label: `Q${Math.floor(now.getMonth() / 3) + 1} ${format(now, 'yyyy')}`,
        };
      case 'lastQuarter':
        const lastQ = subQuarters(now, 1);
        return {
          startDate: format(startOfQuarter(lastQ), 'yyyy-MM-dd'),
          endDate: format(endOfQuarter(lastQ), 'yyyy-MM-dd'),
          label: `Q${Math.floor(lastQ.getMonth() / 3) + 1} ${format(lastQ, 'yyyy')}`,
        };
      case 'ytd':
        return {
          startDate: format(startOfYear(now), 'yyyy-MM-dd'),
          endDate: format(now, 'yyyy-MM-dd'),
          label: `YTD ${format(now, 'yyyy')}`,
        };
      case 'lastYear':
        const lastYear = subYears(now, 1);
        return {
          startDate: format(startOfYear(lastYear), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(subMonths(startOfYear(now), 1)), 'yyyy-MM-dd'),
          label: format(lastYear, 'yyyy'),
        };
      default:
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
          label: format(now, 'MMMM yyyy'),
        };
    }
  }, [dateRange]);

  const { data, loading, error } = useCashFlowStatement({
    startDate,
    endDate,
    realtime: true,
  });

  // Export CSV
  const handleExport = () => {
    const rows = [
      ['Cash Flow Statement', label],
      [''],
      ['SUMMARY'],
      ['Opening Balance', formatCurrencyDetailed(data.openingBalance)],
      ['Total Cash Inflows', formatCurrencyDetailed(data.totalInflows)],
      ['Total Cash Outflows', formatCurrencyDetailed(data.totalOutflows)],
      ['Net Cash Change', formatCurrencyDetailed(data.netCashChange)],
      ['Closing Balance', formatCurrencyDetailed(data.closingBalance)],
      [''],
      ['OPERATING ACTIVITIES'],
      ['Receipts from Customers', formatCurrencyDetailed(data.operating.receiptsFromCustomers)],
      ['Contractor Customer Receipts', formatCurrencyDetailed(data.operating.contractorCustomerReceipts)],
      ['Contractor Payments', formatCurrencyDetailed(-data.operating.contractorPayments)],
      ['Payroll Payments', formatCurrencyDetailed(-data.operating.payrollPayments)],
      ['Subscription Payments', formatCurrencyDetailed(-data.operating.subscriptionPayments)],
      ['Other Operating Payments', formatCurrencyDetailed(-data.operating.otherOperatingPayments)],
      ['Net Cash from Operations', formatCurrencyDetailed(data.operating.netOperating)],
      [''],
      ['FINANCING ACTIVITIES'],
      ['Partner Distributions', formatCurrencyDetailed(-data.financing.partnerDistributions)],
      ['Net Cash from Financing', formatCurrencyDetailed(data.financing.netFinancing)],
      [''],
      ['COMPARISON: ACCRUAL VS CASH'],
      ['', 'Accrual', 'Cash', 'Difference'],
      ['Revenue', formatCurrencyDetailed(data.comparison.accrualRevenue), formatCurrencyDetailed(data.comparison.cashRevenue), formatCurrencyDetailed(data.comparison.revenueDifference)],
      ['Expenses', formatCurrencyDetailed(data.comparison.accrualExpenses), formatCurrencyDetailed(data.comparison.cashExpenses), formatCurrencyDetailed(data.comparison.expensesDifference)],
      ['Profit', formatCurrencyDetailed(data.comparison.accrualProfit), formatCurrencyDetailed(data.comparison.cashProfit), formatCurrencyDetailed(data.comparison.profitDifference)],
      [''],
      ['KEY METRICS'],
      ['Cash Position', formatCurrencyDetailed(data.metrics.cashPosition)],
      ['Monthly Burn Rate', formatCurrencyDetailed(data.metrics.monthlyBurnRate)],
      ['Days Sales Outstanding', `${data.metrics.daysSalesOutstanding} days`],
      ['Cash Runway', `${data.metrics.cashRunway} months`],
      [''],
      ['ACCOUNTS RECEIVABLE', formatCurrencyDetailed(data.totalAR)],
      ['ACCOUNTS PAYABLE', formatCurrencyDetailed(data.totalAP)],
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashflow-${label.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Open Mark as Paid modal
  const openMarkAsPaid = (item: AgingItem, type: 'ar' | 'ap') => {
    setMarkingPaidItem(item);
    setMarkingPaidType(type);
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
  };

  // Handle Mark as Paid
  const handleMarkAsPaid = async () => {
    if (!markingPaidItem || !markingPaidType) return;
    setIsMarkingPaid(true);

    try {
      if (markingPaidItem.type === 'transaction') {
        // Update transaction payment status
        await editTransaction(markingPaidItem.id, {
          paymentStatus: 'paid',
          paymentDate: paymentDate,
          amountPaid: markingPaidItem.amount,
        });
      } else if (markingPaidItem.type === 'timesheet') {
        // Update timesheet - different fields for AR vs AP
        if (markingPaidType === 'ar') {
          // Customer paid us - update invoice status
          await updateTimesheet(markingPaidItem.id, {
            invoiceStatus: 'paid',
            customerPaymentDate: paymentDate,
            customerAmountPaid: markingPaidItem.amount,
          });
        } else {
          // We paid contractor
          await updateTimesheet(markingPaidItem.id, {
            contractorPaymentStatus: 'paid',
            contractorPaymentDate: paymentDate,
          });
        }
      }

      toast.success(
        markingPaidType === 'ar'
          ? 'Payment received recorded'
          : 'Payment made recorded'
      );
      setMarkingPaidItem(null);
      setMarkingPaidType(null);
    } catch (err) {
      console.error('Failed to record payment:', err);
      toast.error('Failed to record payment');
    } finally {
      setIsMarkingPaid(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cash Flow Statement</h1>
          <p className="text-slate-500">Track actual cash movements for {label}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="last3Months">Last 3 Months</option>
            <option value="thisQuarter">This Quarter</option>
            <option value="lastQuarter">Last Quarter</option>
            <option value="ytd">Year to Date</option>
            <option value="lastYear">Last Year</option>
          </select>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Wallet className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium">Opening Balance</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(data.openingBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowDownLeft className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium">Cash Inflows</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(data.totalInflows)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ArrowUpRight className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium">Cash Outflows</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(data.totalOutflows)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${data.netCashChange >= 0 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                <Banknote className={`h-5 w-5 ${data.netCashChange >= 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium">Closing Balance</p>
                <p className={`text-xl font-bold ${data.netCashChange >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {formatCurrency(data.closingBalance)}
                </p>
                <p className={`text-xs ${data.netCashChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.netCashChange >= 0 ? '+' : ''}{formatCurrency(data.netCashChange)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase font-medium mb-1">Cash Position</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(data.metrics.cashPosition)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase font-medium mb-1">Monthly Burn Rate</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(data.metrics.monthlyBurnRate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase font-medium mb-1">Days Sales Outstanding</p>
            <p className="text-lg font-bold text-slate-900">{data.metrics.daysSalesOutstanding} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase font-medium mb-1">Cash Runway</p>
            <p className={`text-lg font-bold ${data.metrics.cashRunway < 6 ? 'text-red-600' : data.metrics.cashRunway < 12 ? 'text-amber-600' : 'text-green-600'}`}>
              {data.metrics.cashRunway > 100 ? '100+' : data.metrics.cashRunway} months
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cash Flow Statement */}
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Statement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Operating Activities */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Operating Activities
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Receipts from Customers</span>
                    <span className="text-green-600 font-medium">
                      {formatCurrency(data.operating.receiptsFromCustomers)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Contractor Customer Receipts</span>
                    <span className="text-green-600 font-medium">
                      {formatCurrency(data.operating.contractorCustomerReceipts)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Contractor Payments</span>
                    <span className="text-red-600 font-medium">
                      ({formatCurrency(data.operating.contractorPayments)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Payroll Payments</span>
                    <span className="text-red-600 font-medium">
                      ({formatCurrency(data.operating.payrollPayments)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subscription Payments</span>
                    <span className="text-red-600 font-medium">
                      ({formatCurrency(data.operating.subscriptionPayments)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Other Operating Payments</span>
                    <span className="text-red-600 font-medium">
                      ({formatCurrency(data.operating.otherOperatingPayments)})
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-900">Net Cash from Operations</span>
                    <span className={`font-bold ${data.operating.netOperating >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(data.operating.netOperating)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financing Activities */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Financing Activities
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Partner Distributions</span>
                    <span className="text-red-600 font-medium">
                      ({formatCurrency(data.financing.partnerDistributions)})
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-900">Net Cash from Financing</span>
                    <span className={`font-bold ${data.financing.netFinancing >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(data.financing.netFinancing)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Change */}
              <div className="pt-4 border-t-2 border-slate-300">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-900">Net Change in Cash</span>
                  <span className={`font-bold text-lg ${data.netCashChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.netCashChange >= 0 ? '+' : ''}{formatCurrency(data.netCashChange)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accrual vs Cash Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Accrual vs Cash Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 font-medium text-slate-500"></th>
                    <th className="text-right py-2 font-medium text-slate-500">Accrual (P&L)</th>
                    <th className="text-right py-2 font-medium text-slate-500">Cash</th>
                    <th className="text-right py-2 font-medium text-slate-500">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-700">Revenue</td>
                    <td className="text-right py-3 text-slate-900">{formatCurrency(data.comparison.accrualRevenue)}</td>
                    <td className="text-right py-3 text-slate-900">{formatCurrency(data.comparison.cashRevenue)}</td>
                    <td className={`text-right py-3 ${data.comparison.revenueDifference >= 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {data.comparison.revenueDifference >= 0 ? '+' : ''}{formatCurrency(data.comparison.revenueDifference)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-700">Expenses</td>
                    <td className="text-right py-3 text-slate-900">{formatCurrency(data.comparison.accrualExpenses)}</td>
                    <td className="text-right py-3 text-slate-900">{formatCurrency(data.comparison.cashExpenses)}</td>
                    <td className={`text-right py-3 ${data.comparison.expensesDifference >= 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {data.comparison.expensesDifference >= 0 ? '+' : ''}{formatCurrency(data.comparison.expensesDifference)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="py-3 font-bold text-slate-900">Net Profit</td>
                    <td className="text-right py-3 font-bold text-slate-900">{formatCurrency(data.comparison.accrualProfit)}</td>
                    <td className="text-right py-3 font-bold text-slate-900">{formatCurrency(data.comparison.cashProfit)}</td>
                    <td className={`text-right py-3 font-bold ${data.comparison.profitDifference >= 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {data.comparison.profitDifference >= 0 ? '+' : ''}{formatCurrency(data.comparison.profitDifference)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {data.comparison.revenueDifference > 0 && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> {formatCurrency(data.comparison.revenueDifference)} in revenue has been recorded but not yet received as cash.
                  This is reflected in Accounts Receivable.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accounts Receivable & Payable */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Accounts Receivable */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Accounts Receivable
              <span className="text-lg font-bold text-green-600 ml-2">{formatCurrency(data.totalAR)}</span>
            </CardTitle>
            <button
              onClick={() => setShowARDetails(!showARDetails)}
              className="text-slate-400 hover:text-slate-600"
            >
              {showARDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </CardHeader>
          <CardContent>
            {/* Aging Buckets */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {data.accountsReceivable.map((bucket, idx) => (
                <div
                  key={bucket.label}
                  className={`p-2 rounded-lg text-center ${
                    idx === 0 ? 'bg-green-50' :
                    idx === 1 ? 'bg-blue-50' :
                    idx === 2 ? 'bg-amber-50' :
                    idx === 3 ? 'bg-orange-50' :
                    'bg-red-50'
                  }`}
                >
                  <p className="text-xs text-slate-500">{bucket.label}</p>
                  <p className={`text-sm font-bold ${
                    idx === 0 ? 'text-green-700' :
                    idx === 1 ? 'text-blue-700' :
                    idx === 2 ? 'text-amber-700' :
                    idx === 3 ? 'text-orange-700' :
                    'text-red-700'
                  }`}>
                    {formatCurrency(bucket.amount)}
                  </p>
                  <p className="text-xs text-slate-400">{bucket.count} items</p>
                </div>
              ))}
            </div>

            {/* Details */}
            {showARDetails && data.accountsReceivable.flatMap((b) => b.items).length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase">
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2">Days</th>
                      <th className="text-right py-2">Amount</th>
                      <th className="text-right py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.accountsReceivable
                      .flatMap((b) => b.items)
                      .sort((a, b) => b.daysOutstanding - a.daysOutstanding)
                      .slice(0, 10)
                      .map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="py-2 text-slate-700">{item.description}</td>
                          <td className={`text-right py-2 ${
                            item.daysOutstanding > 60 ? 'text-red-600' :
                            item.daysOutstanding > 30 ? 'text-amber-600' :
                            'text-slate-600'
                          }`}>
                            {item.daysOutstanding}
                          </td>
                          <td className="text-right py-2 font-medium text-slate-900">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="text-right py-2">
                            <button
                              onClick={() => openMarkAsPaid(item, 'ar')}
                              className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              Mark Paid
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accounts Payable */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Accounts Payable
              <span className="text-lg font-bold text-red-600 ml-2">{formatCurrency(data.totalAP)}</span>
            </CardTitle>
            <button
              onClick={() => setShowAPDetails(!showAPDetails)}
              className="text-slate-400 hover:text-slate-600"
            >
              {showAPDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </CardHeader>
          <CardContent>
            {/* Aging Buckets */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {data.accountsPayable.map((bucket, idx) => (
                <div
                  key={bucket.label}
                  className={`p-2 rounded-lg text-center ${
                    idx === 0 ? 'bg-green-50' :
                    idx === 1 ? 'bg-blue-50' :
                    idx === 2 ? 'bg-amber-50' :
                    idx === 3 ? 'bg-orange-50' :
                    'bg-red-50'
                  }`}
                >
                  <p className="text-xs text-slate-500">{bucket.label}</p>
                  <p className={`text-sm font-bold ${
                    idx === 0 ? 'text-green-700' :
                    idx === 1 ? 'text-blue-700' :
                    idx === 2 ? 'text-amber-700' :
                    idx === 3 ? 'text-orange-700' :
                    'text-red-700'
                  }`}>
                    {formatCurrency(bucket.amount)}
                  </p>
                  <p className="text-xs text-slate-400">{bucket.count} items</p>
                </div>
              ))}
            </div>

            {/* Details */}
            {showAPDetails && data.accountsPayable.flatMap((b) => b.items).length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase">
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2">Days</th>
                      <th className="text-right py-2">Amount</th>
                      <th className="text-right py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.accountsPayable
                      .flatMap((b) => b.items)
                      .sort((a, b) => b.daysOutstanding - a.daysOutstanding)
                      .slice(0, 10)
                      .map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="py-2 text-slate-700">{item.description}</td>
                          <td className={`text-right py-2 ${
                            item.daysOutstanding > 60 ? 'text-red-600' :
                            item.daysOutstanding > 30 ? 'text-amber-600' :
                            'text-slate-600'
                          }`}>
                            {item.daysOutstanding}
                          </td>
                          <td className="text-right py-2 font-medium text-slate-900">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="text-right py-2">
                            <button
                              onClick={() => openMarkAsPaid(item, 'ap')}
                              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              Mark Paid
                            </button>
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

      {/* Upcoming Cash Events */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expected Inflows */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              Expected Cash Inflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingInflows.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No expected inflows</p>
            ) : (
              <div className="space-y-2">
                {data.upcomingInflows.slice(0, 5).map((event, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{event.description}</p>
                      <p className="text-xs text-slate-500">Expected: {format(new Date(event.expectedDate), 'MMM d, yyyy')}</p>
                    </div>
                    <span className="text-green-600 font-bold">{formatCurrency(event.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expected Outflows */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-600" />
              Expected Cash Outflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingOutflows.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No expected outflows</p>
            ) : (
              <div className="space-y-2">
                {data.upcomingOutflows.slice(0, 5).map((event, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{event.description}</p>
                      <p className="text-xs text-slate-500">Due: {format(new Date(event.expectedDate), 'MMM d, yyyy')}</p>
                    </div>
                    <span className="text-red-600 font-bold">{formatCurrency(event.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mark as Paid Modal */}
      {markingPaidItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Record Payment {markingPaidType === 'ar' ? 'Received' : 'Made'}
              </h3>
              <button
                onClick={() => {
                  setMarkingPaidItem(null);
                  setMarkingPaidType(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-500">Description</label>
                <p className="font-medium text-slate-900">{markingPaidItem.description}</p>
              </div>

              <div>
                <label className="text-sm text-slate-500">Amount</label>
                <p className="font-bold text-lg text-slate-900">{formatCurrency(markingPaidItem.amount)}</p>
              </div>

              <div>
                <label className="text-sm text-slate-500">Outstanding</label>
                <p className="text-sm text-slate-600">{markingPaidItem.daysOutstanding} days</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setMarkingPaidItem(null);
                  setMarkingPaidType(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAsPaid}
                disabled={isMarkingPaid}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2 ${
                  markingPaidType === 'ar'
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
                }`}
              >
                {isMarkingPaid ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Confirm Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashFlow;
