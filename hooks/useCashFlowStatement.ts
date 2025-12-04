import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getTransactions,
  subscribeToTransactions,
  getTimesheets,
  getPayrollRecords,
  getDistributions,
  getSubscriptions,
} from '../services/firestoreService';
import { useOrganization } from './useOrganization';
import type { Transaction, ContractorTimesheet, PayrollRecord, Distribution, Subscription } from '../types';
import { convertToUSD } from '../services/currencyService';
import { parseISO, differenceInDays, format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

// ============ TYPES ============

export interface AgingItem {
  id: string;
  description: string;
  date: string;
  amount: number;
  daysOutstanding: number;
  type: 'transaction' | 'timesheet';
  customerName?: string;
  // Invoice tracking
  invoiceNumber?: string;
  invoiceDate?: string;
  // Payment tracking
  totalPaid?: number;
  remainingBalance: number;
  paymentStatus?: 'unpaid' | 'partial' | 'paid';
}

export interface AgingBucket {
  label: string;
  amount: number;
  count: number;
  items: AgingItem[];
}

export interface CashEvent {
  type: 'inflow' | 'outflow';
  description: string;
  expectedDate: string;
  amount: number;
  source: 'invoice' | 'payroll' | 'subscription' | 'contractor' | 'distribution';
}

export interface OperatingActivities {
  receiptsFromCustomers: number;
  contractorCustomerReceipts: number;
  contractorPayments: number;
  payrollPayments: number;
  subscriptionPayments: number;
  otherOperatingPayments: number;
  netOperating: number;
}

export interface FinancingActivities {
  partnerDistributions: number;
  netFinancing: number;
}

export interface CashFlowComparison {
  accrualRevenue: number;
  cashRevenue: number;
  revenueDifference: number;
  accrualExpenses: number;
  cashExpenses: number;
  expensesDifference: number;
  accrualProfit: number;
  cashProfit: number;
  profitDifference: number;
}

export interface CashFlowMetrics {
  cashPosition: number;
  monthlyBurnRate: number;
  daysSalesOutstanding: number;
  cashRunway: number;
}

export interface CashFlowData {
  // Summary
  openingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  closingBalance: number;
  netCashChange: number;

  // Operating Activities
  operating: OperatingActivities;

  // Financing Activities
  financing: FinancingActivities;

  // Comparison with Accrual
  comparison: CashFlowComparison;

  // Aging Reports
  accountsReceivable: AgingBucket[];
  accountsPayable: AgingBucket[];
  totalAR: number;
  totalAP: number;

  // Metrics
  metrics: CashFlowMetrics;

  // Upcoming cash events
  upcomingInflows: CashEvent[];
  upcomingOutflows: CashEvent[];
}

interface UseCashFlowStatementOptions {
  startDate: string;
  endDate: string;
  realtime?: boolean;
}

// ============ HELPER FUNCTIONS ============

function calculateAgingBucket(items: AgingItem[], today: Date): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { label: 'Current', amount: 0, count: 0, items: [] },
    { label: '1-30 days', amount: 0, count: 0, items: [] },
    { label: '31-60 days', amount: 0, count: 0, items: [] },
    { label: '61-90 days', amount: 0, count: 0, items: [] },
    { label: '90+ days', amount: 0, count: 0, items: [] },
  ];

  items.forEach((item) => {
    const days = item.daysOutstanding;
    let bucketIndex = 0;
    if (days <= 0) bucketIndex = 0;
    else if (days <= 30) bucketIndex = 1;
    else if (days <= 60) bucketIndex = 2;
    else if (days <= 90) bucketIndex = 3;
    else bucketIndex = 4;

    // Use remainingBalance for bucket totals (accounts for partial payments)
    buckets[bucketIndex].amount += item.remainingBalance;
    buckets[bucketIndex].count += 1;
    buckets[bucketIndex].items.push(item);
  });

  return buckets;
}

function getPaymentTermsDays(terms?: string): number {
  switch (terms) {
    case 'immediate': return 0;
    case 'net_15': return 15;
    case 'net_30': return 30;
    case 'net_45': return 45;
    case 'net_60': return 60;
    case 'net_90': return 90;
    default: return 30; // Default to Net 30
  }
}

// ============ MAIN HOOK ============

export function useCashFlowStatement(options: UseCashFlowStatementOptions) {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [timesheets, setTimesheets] = useState<ContractorTimesheet[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { startDate, endDate, realtime } = options;

  // Fetch all data
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [txns, ts, payroll, dists, subs] = await Promise.all([
          getTransactions(user.uid, { status: 'posted' }),
          getTimesheets(user.uid),
          getPayrollRecords(user.uid),
          getDistributions(user.uid),
          getSubscriptions(user.uid),
        ]);

        setTransactions(txns);
        setTimesheets(ts);
        setPayrollRecords(payroll);
        setDistributions(dists);
        setSubscriptions(subs);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch cash flow data');
        console.error('Error fetching cash flow data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (realtime) {
      // Set up realtime subscription for transactions
      const unsubscribe = subscribeToTransactions(user.uid, (data) => {
        setTransactions(data.filter((t) => t.status === 'posted'));
      });
      // Still fetch other data once
      fetchData();
      return () => unsubscribe();
    } else {
      fetchData();
    }
  }, [user?.uid, realtime]);

  // Calculate cash flow data
  const cashFlowData = useMemo<CashFlowData>(() => {
    const today = new Date();
    const openingBalance = organization?.bankBalance || 0;

    // ============ FILTER BY DATE RANGE ============

    // Cash Inflows: Revenue transactions with payment
    const paidRevenueTransactions = transactions.filter((t) => {
      if (t.type !== 'revenue') return false;
      // For backward compatibility: if no paymentStatus, assume paid if posted
      const isPaid = t.paymentStatus === 'paid' || (!t.paymentStatus && t.status === 'posted');
      // Use paymentDate if available, otherwise fall back to date
      const effectiveDate = t.paymentDate || t.date;
      return isPaid && effectiveDate >= startDate && effectiveDate <= endDate;
    });

    // Cash Outflows: Expense transactions with payment
    const paidExpenseTransactions = transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      // For backward compatibility: expenses are typically paid immediately
      const isPaid = t.paymentStatus === 'paid' || t.paymentStatus === undefined;
      const effectiveDate = t.paymentDate || t.date;
      return isPaid && effectiveDate >= startDate && effectiveDate <= endDate;
    });

    // Contractor customer receipts (money IN from customers)
    const paidTimesheetReceipts = timesheets.filter((ts) => {
      if (ts.invoiceStatus !== 'paid') return false;
      const paymentDate = ts.customerPaymentDate;
      return paymentDate && paymentDate >= startDate && paymentDate <= endDate;
    });

    // Contractor payments (money OUT to contractors)
    const paidContractorPayments = timesheets.filter((ts) => {
      if (ts.contractorPaymentStatus !== 'paid') return false;
      const paymentDate = ts.contractorPaymentDate;
      return paymentDate && paymentDate >= startDate && paymentDate <= endDate;
    });

    // Paid payroll
    const paidPayroll = payrollRecords.filter((p) => {
      if (p.status !== 'paid') return false;
      const paymentDate = p.paidDate;
      return paymentDate && paymentDate >= startDate && paymentDate <= endDate;
    });

    // Completed distributions
    const completedDistributions = distributions.filter((d) => {
      if (d.status !== 'completed') return false;
      return d.date >= startDate && d.date <= endDate;
    });

    // Active subscriptions (estimate monthly payments)
    const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');

    // ============ CALCULATE OPERATING ACTIVITIES ============

    const receiptsFromCustomers = paidRevenueTransactions.reduce(
      (sum, t) => sum + (t.amountPaid || t.amount),
      0
    );

    const contractorCustomerReceipts = paidTimesheetReceipts.reduce(
      (sum, ts) => sum + (ts.customerAmountPaid || ts.externalRevenue || 0),
      0
    );

    const contractorPayments = paidContractorPayments.reduce(
      (sum, ts) => sum + (ts.internalCostUSD || ts.internalCost || 0),
      0
    );

    const payrollPayments = paidPayroll.reduce((sum, p) => {
      const amountUSD = p.currency && p.currency !== 'USD'
        ? convertToUSD(p.netAmount, p.currency)
        : p.netAmount;
      return sum + amountUSD;
    }, 0);

    // Estimate subscription payments for the period
    const monthsInPeriod = Math.max(1, differenceInDays(parseISO(endDate), parseISO(startDate)) / 30);
    const subscriptionPayments = activeSubscriptions.reduce((sum, s) => {
      const monthlyCost = s.billingCycle === 'annual' ? s.cost / 12 : s.cost;
      return sum + (monthlyCost * monthsInPeriod);
    }, 0);

    const otherOperatingPayments = paidExpenseTransactions
      .filter((t) => !['payroll', 'contractors', 'software'].includes(t.category))
      .reduce((sum, t) => sum + (t.amountPaid || t.amount), 0);

    const netOperating =
      receiptsFromCustomers +
      contractorCustomerReceipts -
      contractorPayments -
      payrollPayments -
      subscriptionPayments -
      otherOperatingPayments;

    // ============ CALCULATE FINANCING ACTIVITIES ============

    const partnerDistributions = completedDistributions.reduce(
      (sum, d) => sum + d.amount,
      0
    );

    const netFinancing = -partnerDistributions;

    // ============ CALCULATE TOTALS ============

    const totalInflows = receiptsFromCustomers + contractorCustomerReceipts;
    const totalOutflows =
      contractorPayments +
      payrollPayments +
      subscriptionPayments +
      otherOperatingPayments +
      partnerDistributions;
    const netCashChange = totalInflows - totalOutflows;
    const closingBalance = openingBalance + netCashChange;

    // ============ ACCRUAL VS CASH COMPARISON ============

    // Accrual: All posted transactions in date range (by invoice date)
    const accrualRevenue = transactions
      .filter((t) => t.type === 'revenue' && t.date >= startDate && t.date <= endDate)
      .reduce((sum, t) => sum + t.amount, 0) +
      timesheets
        .filter((ts) => {
          const monthStart = `${ts.month}-01`;
          return monthStart >= startDate && monthStart <= endDate;
        })
        .reduce((sum, ts) => sum + (ts.externalRevenue || 0), 0);

    const accrualExpenses = transactions
      .filter((t) => t.type === 'expense' && t.date >= startDate && t.date <= endDate)
      .reduce((sum, t) => sum + t.amount, 0) +
      timesheets
        .filter((ts) => {
          const monthStart = `${ts.month}-01`;
          return monthStart >= startDate && monthStart <= endDate;
        })
        .reduce((sum, ts) => sum + (ts.internalCostUSD || 0), 0) +
      payrollRecords
        .filter((p) => {
          const monthStart = `${p.month}-01`;
          return monthStart >= startDate && monthStart <= endDate;
        })
        .reduce((sum, p) => {
          const amountUSD = p.currency && p.currency !== 'USD'
            ? convertToUSD(p.netAmount, p.currency)
            : p.netAmount;
          return sum + amountUSD;
        }, 0);

    const accrualProfit = accrualRevenue - accrualExpenses;
    const cashRevenue = totalInflows;
    const cashExpenses = totalOutflows;
    const cashProfit = netCashChange;

    // ============ ACCOUNTS RECEIVABLE (Unpaid Invoices) ============

    const arItems: AgingItem[] = [];

    // Unpaid revenue transactions
    transactions
      .filter((t) => t.type === 'revenue' && t.paymentStatus !== 'paid' && t.status === 'posted')
      .forEach((t) => {
        const invoiceDate = parseISO(t.invoiceDate || t.date);
        const daysOutstanding = differenceInDays(today, invoiceDate);
        const totalPaid = t.totalPaid || t.amountPaid || 0;
        const remainingBalance = t.amount - totalPaid;
        arItems.push({
          id: t.id,
          description: t.description,
          date: t.date,
          amount: t.amount,
          daysOutstanding,
          type: 'transaction',
          invoiceNumber: t.invoiceNumber,
          invoiceDate: t.invoiceDate || t.date,
          totalPaid,
          remainingBalance,
          paymentStatus: t.paymentStatus || 'unpaid',
        });
      });

    // Unpaid contractor timesheets (customer side)
    timesheets
      .filter((ts) => ts.invoiceStatus !== 'paid' && ts.status === 'approved')
      .forEach((ts) => {
        const invoiceDateStr = ts.invoiceDate || `${ts.month}-01`;
        const invoiceDate = parseISO(invoiceDateStr);
        const daysOutstanding = differenceInDays(today, invoiceDate);
        const totalAmount = ts.externalRevenue || 0;
        const totalPaid = ts.customerAmountPaid || 0;
        const remainingBalance = totalAmount - totalPaid;
        arItems.push({
          id: ts.id,
          description: `${ts.contractorName} - ${ts.month}`,
          date: invoiceDateStr,
          amount: totalAmount,
          daysOutstanding,
          type: 'timesheet',
          customerName: ts.customerName,
          invoiceNumber: ts.invoiceNumber,
          invoiceDate: invoiceDateStr,
          totalPaid,
          remainingBalance,
          paymentStatus: ts.invoiceStatus === 'partial' ? 'partial' : 'unpaid',
        });
      });

    const accountsReceivable = calculateAgingBucket(arItems, today);
    const totalAR = arItems.reduce((sum, item) => sum + item.remainingBalance, 0);

    // ============ ACCOUNTS PAYABLE (Unpaid Bills) ============

    const apItems: AgingItem[] = [];

    // Unpaid expense transactions
    transactions
      .filter((t) => t.type === 'expense' && t.paymentStatus !== 'paid' && t.status === 'posted')
      .forEach((t) => {
        const invoiceDate = parseISO(t.date);
        const daysOutstanding = differenceInDays(today, invoiceDate);
        const totalPaid = t.totalPaid || t.amountPaid || 0;
        const remainingBalance = t.amount - totalPaid;
        apItems.push({
          id: t.id,
          description: t.description,
          date: t.date,
          amount: t.amount,
          daysOutstanding,
          type: 'transaction',
          totalPaid,
          remainingBalance,
          paymentStatus: t.paymentStatus || 'unpaid',
        });
      });

    // Unpaid contractor timesheets (contractor side)
    timesheets
      .filter((ts) => ts.contractorPaymentStatus !== 'paid' && ts.status === 'approved')
      .forEach((ts) => {
        const invoiceDateStr = `${ts.month}-01`;
        const invoiceDate = parseISO(invoiceDateStr);
        const daysOutstanding = differenceInDays(today, invoiceDate);
        const totalAmount = ts.internalCostUSD || ts.internalCost || 0;
        apItems.push({
          id: ts.id,
          description: `${ts.contractorName} - ${ts.month}`,
          date: invoiceDateStr,
          amount: totalAmount,
          daysOutstanding,
          type: 'timesheet',
          totalPaid: 0,
          remainingBalance: totalAmount,
          paymentStatus: 'unpaid',
        });
      });

    // Pending payroll
    payrollRecords
      .filter((p) => p.status === 'pending')
      .forEach((p) => {
        const invoiceDateStr = `${p.month}-01`;
        const invoiceDate = parseISO(invoiceDateStr);
        const daysOutstanding = differenceInDays(today, invoiceDate);
        const amountUSD = p.currency && p.currency !== 'USD'
          ? convertToUSD(p.netAmount, p.currency)
          : p.netAmount;
        apItems.push({
          id: p.id,
          description: `Payroll: ${p.teamMemberName} - ${p.month}`,
          date: invoiceDateStr,
          amount: amountUSD,
          daysOutstanding,
          type: 'transaction',
          totalPaid: 0,
          remainingBalance: amountUSD,
          paymentStatus: 'unpaid',
        });
      });

    const accountsPayable = calculateAgingBucket(apItems, today);
    const totalAP = apItems.reduce((sum, item) => sum + item.remainingBalance, 0);

    // ============ METRICS ============

    // Calculate burn rate (average monthly expenses over last 3 months)
    const threeMonthsAgo = format(subMonths(today, 3), 'yyyy-MM-dd');
    const recentExpenses = transactions
      .filter((t) => t.type === 'expense' && t.date >= threeMonthsAgo)
      .reduce((sum, t) => sum + t.amount, 0);
    const monthlyBurnRate = recentExpenses / 3;

    // DSO calculation
    const avgDailyRevenue = accrualRevenue / Math.max(1, differenceInDays(parseISO(endDate), parseISO(startDate)));
    const daysSalesOutstanding = avgDailyRevenue > 0 ? totalAR / avgDailyRevenue : 0;

    // Cash runway
    const cashRunway = monthlyBurnRate > 0 ? closingBalance / monthlyBurnRate : 999;

    // ============ UPCOMING CASH EVENTS ============

    const upcomingInflows: CashEvent[] = [];
    const upcomingOutflows: CashEvent[] = [];

    // Expected payments from AR
    arItems.slice(0, 10).forEach((item) => {
      const expectedDate = format(
        new Date(parseISO(item.date).getTime() + 30 * 24 * 60 * 60 * 1000),
        'yyyy-MM-dd'
      );
      upcomingInflows.push({
        type: 'inflow',
        description: item.description,
        expectedDate,
        amount: item.amount,
        source: 'invoice',
      });
    });

    // Upcoming payroll
    payrollRecords
      .filter((p) => p.status === 'pending')
      .slice(0, 5)
      .forEach((p) => {
        const amountUSD = p.currency && p.currency !== 'USD'
          ? convertToUSD(p.netAmount, p.currency)
          : p.netAmount;
        upcomingOutflows.push({
          type: 'outflow',
          description: `Payroll: ${p.teamMemberName}`,
          expectedDate: `${p.month}-28`,
          amount: amountUSD,
          source: 'payroll',
        });
      });

    // Upcoming subscriptions
    activeSubscriptions.slice(0, 5).forEach((s) => {
      upcomingOutflows.push({
        type: 'outflow',
        description: s.vendor,
        expectedDate: s.nextBillingDate,
        amount: s.cost,
        source: 'subscription',
      });
    });

    // Pending distributions
    distributions
      .filter((d) => d.status === 'pending')
      .slice(0, 5)
      .forEach((d) => {
        upcomingOutflows.push({
          type: 'outflow',
          description: `Distribution: ${d.partnerName}`,
          expectedDate: d.date,
          amount: d.amount,
          source: 'distribution',
        });
      });

    // Sort by date
    upcomingInflows.sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));
    upcomingOutflows.sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));

    return {
      openingBalance,
      totalInflows,
      totalOutflows,
      closingBalance,
      netCashChange,
      operating: {
        receiptsFromCustomers,
        contractorCustomerReceipts,
        contractorPayments,
        payrollPayments,
        subscriptionPayments,
        otherOperatingPayments,
        netOperating,
      },
      financing: {
        partnerDistributions,
        netFinancing,
      },
      comparison: {
        accrualRevenue,
        cashRevenue,
        revenueDifference: accrualRevenue - cashRevenue,
        accrualExpenses,
        cashExpenses,
        expensesDifference: accrualExpenses - cashExpenses,
        accrualProfit,
        cashProfit,
        profitDifference: accrualProfit - cashProfit,
      },
      accountsReceivable,
      accountsPayable,
      totalAR,
      totalAP,
      metrics: {
        cashPosition: closingBalance,
        monthlyBurnRate,
        daysSalesOutstanding: Math.round(daysSalesOutstanding),
        cashRunway: Math.round(cashRunway * 10) / 10,
      },
      upcomingInflows,
      upcomingOutflows,
    };
  }, [transactions, timesheets, payrollRecords, distributions, subscriptions, organization, startDate, endDate]);

  return {
    data: cashFlowData,
    loading,
    error,
  };
}

// ============ EXPORT LABELS ============

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-700',
  partial: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
};

export const PAYMENT_TERMS_LABELS: Record<string, string> = {
  immediate: 'Immediate',
  net_15: 'Net 15',
  net_30: 'Net 30',
  net_45: 'Net 45',
  net_60: 'Net 60',
  net_90: 'Net 90',
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  not_invoiced: 'Not Invoiced',
  invoiced: 'Invoiced',
  paid: 'Paid',
  partial: 'Partial Payment',
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  not_invoiced: 'bg-slate-100 text-slate-600',
  invoiced: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  check: 'Check',
  credit_card: 'Credit Card',
  cash: 'Cash',
  other: 'Other',
};
