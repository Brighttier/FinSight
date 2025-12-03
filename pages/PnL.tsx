import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, Download, Users, Wallet, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePnL } from '../hooks/useTransactions';
import { useContractors } from '../hooks/useContractors';
import { usePartners } from '../hooks/usePartners';
import { useOrganization } from '../hooks/useOrganization';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, startOfQuarter, endOfQuarter, subYears, subQuarters, differenceInMonths, isWithinInterval, parseISO } from 'date-fns';

type DateRange = 'thisMonth' | 'lastMonth' | 'last3Months' | 'last6Months' | 'thisQuarter' | 'lastQuarter' | 'ytd' | 'lastYear';

const categoryLabels: Record<string, string> = {
  revenue: 'Revenue',
  payroll: 'Payroll',
  contractors: 'Contractors',
  software: 'Software',
  marketing: 'Marketing',
  office: 'Office',
  travel: 'Travel',
  utilities: 'Utilities',
  legal: 'Legal',
  reimbursements: 'Reimbursements',
  other: 'Other',
  // Categories from usePnL hook
  'Team Payroll': 'Team Payroll',
  'Contractor Payments': 'Contractor Payments',
  subscriptions: 'Subscriptions',
};

const categoryColors: Record<string, string> = {
  payroll: '#ef4444',
  contractors: '#f97316',
  software: '#6366f1',
  marketing: '#8b5cf6',
  office: '#06b6d4',
  travel: '#10b981',
  utilities: '#f59e0b',
  legal: '#ec4899',
  reimbursements: '#0ea5e9',
  other: '#64748b',
  // Categories from usePnL hook
  'Team Payroll': '#dc2626',
  'Contractor Payments': '#ea580c',
  subscriptions: '#a855f7',
};

const PnL = () => {
  const [dateRange, setDateRange] = useState<DateRange>('thisMonth');
  const { subscriptions, loading: subscriptionsLoading } = useSubscriptions({ realtime: true });

  // Calculate date range
  const { startDate, endDate, label, filterMonth, filterYear } = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'thisMonth':
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
          label: format(now, 'MMM yyyy'),
          filterMonth: format(now, 'yyyy-MM'),
          filterYear: format(now, 'yyyy'),
        };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return {
          startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
          label: format(lastMonth, 'MMM yyyy'),
          filterMonth: format(lastMonth, 'yyyy-MM'),
          filterYear: format(lastMonth, 'yyyy'),
        };
      case 'last3Months':
        const threeMonthsAgo = subMonths(now, 2);
        return {
          startDate: format(startOfMonth(threeMonthsAgo), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
          label: `${format(threeMonthsAgo, 'MMM')} - ${format(now, 'MMM yyyy')}`,
          filterMonth: undefined,
          filterYear: format(now, 'yyyy'),
        };
      case 'last6Months':
        const sixMonthsAgo = subMonths(now, 5);
        return {
          startDate: format(startOfMonth(sixMonthsAgo), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
          label: `${format(sixMonthsAgo, 'MMM')} - ${format(now, 'MMM yyyy')}`,
          filterMonth: undefined,
          filterYear: format(now, 'yyyy'),
        };
      case 'thisQuarter':
        const quarterStart = startOfQuarter(now);
        const quarterEnd = endOfQuarter(now);
        const quarterNum = Math.floor(now.getMonth() / 3) + 1;
        return {
          startDate: format(quarterStart, 'yyyy-MM-dd'),
          endDate: format(quarterEnd, 'yyyy-MM-dd'),
          label: `Q${quarterNum} ${format(now, 'yyyy')}`,
          filterMonth: undefined,
          filterYear: format(now, 'yyyy'),
        };
      case 'lastQuarter':
        const lastQuarterDate = subQuarters(now, 1);
        const lastQuarterStart = startOfQuarter(lastQuarterDate);
        const lastQuarterEnd = endOfQuarter(lastQuarterDate);
        const lastQuarterNum = Math.floor(lastQuarterDate.getMonth() / 3) + 1;
        return {
          startDate: format(lastQuarterStart, 'yyyy-MM-dd'),
          endDate: format(lastQuarterEnd, 'yyyy-MM-dd'),
          label: `Q${lastQuarterNum} ${format(lastQuarterDate, 'yyyy')}`,
          filterMonth: undefined,
          filterYear: format(lastQuarterDate, 'yyyy'),
        };
      case 'ytd':
        return {
          startDate: format(startOfYear(now), 'yyyy-MM-dd'),
          endDate: format(now, 'yyyy-MM-dd'),
          label: 'Year to Date',
          filterMonth: undefined,
          filterYear: format(now, 'yyyy'),
        };
      case 'lastYear':
        const lastYearDate = subYears(now, 1);
        return {
          startDate: format(startOfYear(lastYearDate), 'yyyy-MM-dd'),
          endDate: format(new Date(lastYearDate.getFullYear(), 11, 31), 'yyyy-MM-dd'),
          label: format(lastYearDate, 'yyyy'),
          filterMonth: undefined,
          filterYear: format(lastYearDate, 'yyyy'),
        };
    }
  }, [dateRange]);

  const { expenses, expensesByCategory, revenueByCategory, loading } = usePnL(startDate, endDate);
  const { timesheets, loading: contractorLoading, calculateMetrics } = useContractors({ realtime: true });
  const { partners, loading: partnersLoading, metrics: partnerMetrics } = usePartners({ realtime: true });
  const { organization, loading: orgLoading } = useOrganization();

  // Calculate subscription costs for the selected period
  const subscriptionCosts = useMemo(() => {
    if (!subscriptions || subscriptions.length === 0) return 0;

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const monthsInPeriod = differenceInMonths(end, start) + 1; // inclusive

    let totalCost = 0;

    subscriptions
      .filter((sub) => sub.status === 'active')
      .forEach((sub) => {
        if (sub.billingCycle === 'monthly') {
          // Monthly subscriptions: cost × number of months in period
          totalCost += sub.cost * monthsInPeriod;
        } else if (sub.billingCycle === 'annual') {
          // Annual subscriptions: include if billing date falls within the period
          const nextBillingDate = parseISO(sub.nextBillingDate);
          if (isWithinInterval(nextBillingDate, { start, end })) {
            totalCost += sub.cost;
          }
        }
      });

    return totalCost;
  }, [subscriptions, startDate, endDate]);

  // Calculate contractor metrics for the selected period
  const contractorMetrics = useMemo(() => {
    // For single month filters
    if (filterMonth) {
      return calculateMetrics(filterMonth);
    }
    // For quarters
    if (dateRange === 'thisQuarter' || dateRange === 'lastQuarter') {
      const quarterNum = dateRange === 'thisQuarter'
        ? Math.floor(new Date().getMonth() / 3) + 1
        : Math.floor(subQuarters(new Date(), 1).getMonth() / 3) + 1;
      const year = dateRange === 'thisQuarter'
        ? format(new Date(), 'yyyy')
        : format(subQuarters(new Date(), 1), 'yyyy');
      return calculateMetrics(undefined, `Q${quarterNum}`, year);
    }
    // For year-based filters (ytd, lastYear, last3Months, last6Months)
    return calculateMetrics(undefined, undefined, filterYear);
  }, [calculateMetrics, dateRange, filterMonth, filterYear]);

  // Calculate transaction revenue from revenueByCategory (excluding contractor services which is added separately)
  const transactionRevenue = useMemo(() => {
    return Object.entries(revenueByCategory)
      .filter(([category]) => category !== 'Contractor Services')
      .reduce((sum, [, value]) => sum + (value as number), 0);
  }, [revenueByCategory]);

  // Combined totals including subscriptions
  // Note: usePnL already includes contractor costs in 'expenses' and 'expensesByCategory'
  const totalRevenue = transactionRevenue + contractorMetrics.totalRevenue;
  const totalExpenses = expenses + subscriptionCosts;
  const totalProfit = totalRevenue - totalExpenses;

  // Prepare expense breakdown data for chart (including subscriptions)
  // Note: Contractor costs are already in expensesByCategory as 'Contractor Payments' from usePnL
  const combinedExpenses = useMemo(() => {
    const combined = { ...expensesByCategory };
    if (subscriptionCosts > 0) {
      combined['subscriptions'] = (combined['subscriptions'] || 0) + subscriptionCosts;
    }
    return combined;
  }, [expensesByCategory, subscriptionCosts]);

  const expenseData = useMemo(() => {
    return Object.entries(combinedExpenses)
      .map(([category, value]) => ({
        name: category === 'subscriptions'
          ? 'Subscriptions'
          : (categoryLabels[category] || category),
        value: value as number,
        category,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [combinedExpenses]);

  // Calculate percentages
  const revenuePercent = 100;
  const expensePercent = totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : 0;
  const profitPercent = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  // Get retention percentage from organization settings (default 0 = distribute all)
  const retentionPercentage = organization?.retentionPercentage ?? 0;
  const bankBalance = organization?.bankBalance;
  const lastBankBalanceUpdate = organization?.lastBankBalanceUpdate;

  // Calculate profit allocation with retention
  const retainedAmount = totalProfit > 0 ? (totalProfit * retentionPercentage) / 100 : 0;
  const distributablePool = totalProfit - retainedAmount;

  // Calculate partner distributions from distributable pool (not total profit)
  const activePartners = partners.filter((p) => p.status === 'active');
  const totalPartnerShare = partnerMetrics.totalShareAllocated; // percentage allocated to partners
  const partnerDistributionAmount = distributablePool > 0 ? (distributablePool * totalPartnerShare) / 100 : 0;
  const companyPoolAmount = totalProfit - partnerDistributionAmount; // retained + undistributed

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleExport = () => {
    // Build revenue breakdown rows for CSV
    const revenueRows = Object.entries(revenueByCategory)
      .filter(([category]) => category !== 'Contractor Services')
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([category, value]) => [
        `  - ${category}`,
        (value as number).toString(),
        totalRevenue > 0 ? `${(((value as number) / totalRevenue) * 100).toFixed(1)}%` : '0%',
      ]);

    const csvData = [
      ['Category', 'Amount', '% of Revenue'],
      ['Total Revenue', totalRevenue.toString(), '100%'],
      ...revenueRows,
      ...(contractorMetrics.totalRevenue > 0 ? [['  - Contractor Services', contractorMetrics.totalRevenue.toString(), totalRevenue > 0 ? `${((contractorMetrics.totalRevenue / totalRevenue) * 100).toFixed(1)}%` : '0%']] : []),
      ['Total Expenses', totalExpenses.toString(), `${expensePercent}%`],
      ...Object.entries(combinedExpenses).map(([cat, val]) => [
        cat === 'subscriptions'
          ? 'Subscriptions'
          : (categoryLabels[cat] || cat),
        (val as number).toString(),
        totalRevenue > 0 ? `${(((val as number) / totalRevenue) * 100).toFixed(1)}%` : '0%',
      ]),
      ['Net Profit', totalProfit.toString(), `${profitPercent}%`],
      ['', '', ''],
      ['--- Profit Allocation ---', '', ''],
      ...(retentionPercentage > 0 ? [
        [`Company Reserves (${retentionPercentage}%)`, retainedAmount.toString(), totalRevenue > 0 ? `${((retainedAmount / totalRevenue) * 100).toFixed(1)}%` : '0%'],
        [`Distributable Pool (${100 - retentionPercentage}%)`, distributablePool.toString(), totalRevenue > 0 ? `${((distributablePool / totalRevenue) * 100).toFixed(1)}%` : '0%'],
      ] : []),
      [`Partner Share (${totalPartnerShare}%)`, partnerDistributionAmount.toString(), totalRevenue > 0 ? `${((partnerDistributionAmount / totalRevenue) * 100).toFixed(1)}%` : '0%'],
      ...activePartners.map((partner) => [
        `  - ${partner.name} (${partner.sharePercentage}%)`,
        ((distributablePool * partner.sharePercentage) / 100).toString(),
        totalRevenue > 0 ? `${(((distributablePool * partner.sharePercentage) / 100 / totalRevenue) * 100).toFixed(1)}%` : '0%',
      ]),
      ['Company Pool (Final)', companyPoolAmount.toString(), totalRevenue > 0 ? `${((companyPoolAmount / totalRevenue) * 100).toFixed(1)}%` : '0%'],
      ['', '', ''],
      ['--- Bank Balance ---', '', ''],
      ['Current Balance', bankBalance !== undefined ? bankBalance.toString() : 'Not configured', lastBankBalanceUpdate || ''],
    ];

    const csv = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pnl-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  const isLoading = loading || contractorLoading || partnersLoading || orgLoading || subscriptionsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">P&L Statement</h2>
        <div className="flex items-center gap-4">
          <select
            value={dateRange}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDateRange(e.target.value as DateRange)}
            className="px-3 py-2 text-sm font-medium border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <optgroup label="Monthly">
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="last3Months">Last 3 Months</option>
              <option value="last6Months">Last 6 Months</option>
            </optgroup>
            <optgroup label="Quarterly">
              <option value="thisQuarter">This Quarter</option>
              <option value="lastQuarter">Last Quarter</option>
            </optgroup>
            <optgroup label="Yearly">
              <option value="ytd">Year to Date</option>
              <option value="lastYear">Last Year</option>
            </optgroup>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="text-slate-500">Loading P&L data...</span>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* P&L Table */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Statement Details - {label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {totalRevenue === 0 && totalExpenses === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500">No transactions for this period</p>
                  <p className="text-sm text-slate-400 mt-1">Add transactions to see your P&L</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 rounded-l-lg">Category</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right rounded-r-lg">% of Rev</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Revenue Section */}
                      <tr className="bg-emerald-50/50">
                        <td className="px-4 py-3 font-bold text-slate-900">Total Revenue</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          {formatCurrency(totalRevenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">100%</td>
                      </tr>

                      {/* Revenue breakdown - show categories from transactions */}
                      {Object.entries(revenueByCategory)
                        .filter(([category]) => category !== 'Contractor Services') // Show contractor separately
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([category, value]) => (
                          <tr key={`rev-${category}`}>
                            <td className="px-8 py-2 text-slate-600">{category}</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(value as number)}</td>
                            <td className="px-4 py-2 text-right text-slate-400">
                              {totalRevenue > 0 ? `${(((value as number) / totalRevenue) * 100).toFixed(1)}%` : '0%'}
                            </td>
                          </tr>
                        ))}
                      {contractorMetrics.totalRevenue > 0 && (
                        <tr>
                          <td className="px-8 py-2 text-slate-600">Contractor Services</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(contractorMetrics.totalRevenue)}</td>
                          <td className="px-4 py-2 text-right text-slate-400">
                            {totalRevenue > 0 ? `${((contractorMetrics.totalRevenue / totalRevenue) * 100).toFixed(1)}%` : '0%'}
                          </td>
                        </tr>
                      )}

                      <tr>
                        <td colSpan={3} className="h-4"></td>
                      </tr>

                      {/* Expenses Section */}
                      <tr className="bg-red-50/30">
                        <td className="px-4 py-3 font-semibold text-slate-800">Total Expenses</td>
                        <td className="px-4 py-3 text-right text-red-600">
                          {formatCurrency(totalExpenses)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">{expensePercent}%</td>
                      </tr>

                      {/* Expense breakdown */}
                      {Object.entries(combinedExpenses)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([category, value]) => (
                          <tr key={category}>
                            <td className="px-8 py-2 text-slate-600">
                              {category === 'subscriptions'
                                ? 'Subscriptions'
                                : (categoryLabels[category] || category)}
                            </td>
                            <td className="px-4 py-2 text-right">{formatCurrency(value as number)}</td>
                            <td className="px-4 py-2 text-right text-slate-400">
                              {totalRevenue > 0 ? `${(((value as number) / totalRevenue) * 100).toFixed(1)}%` : '0%'}
                            </td>
                          </tr>
                        ))}

                      <tr>
                        <td colSpan={3} className="h-4"></td>
                      </tr>

                      {/* Contractor Profit Summary (if applicable) */}
                      {contractorMetrics.totalRevenue > 0 && (
                        <>
                          <tr className="bg-blue-50/30">
                            <td className="px-4 py-2 font-medium text-blue-800">Contractor Services Profit</td>
                            <td className="px-4 py-2 text-right text-blue-600 font-medium">
                              {formatCurrency(contractorMetrics.totalProfit)}
                            </td>
                            <td className="px-4 py-2 text-right text-blue-500">
                              {contractorMetrics.profitMargin.toFixed(1)}% margin
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={3} className="h-4"></td>
                          </tr>
                        </>
                      )}

                      {/* Net Profit */}
                      <tr className="bg-indigo-50 border-t-2 border-indigo-100">
                        <td className="px-4 py-4 font-bold text-indigo-900 text-lg">Net Profit</td>
                        <td
                          className={`px-4 py-4 text-right font-bold text-lg ${
                            totalProfit >= 0 ? 'text-indigo-700' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(totalProfit)}
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-indigo-600">
                          {profitPercent}%
                        </td>
                      </tr>

                      {/* Profit Allocation Section - show if there's profit */}
                      {totalProfit > 0 && (
                        <>
                          <tr>
                            <td colSpan={3} className="h-4"></td>
                          </tr>

                          {/* Section Header */}
                          <tr>
                            <td colSpan={3} className="px-4 py-2">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Profit Allocation
                              </p>
                            </td>
                          </tr>

                          {/* Company Reserves (Retention) - only show if retention > 0 */}
                          {retentionPercentage > 0 && (
                            <tr className="bg-amber-50/50">
                              <td className="px-4 py-3 font-medium text-amber-800">
                                Company Reserves ({retentionPercentage}%)
                              </td>
                              <td className="px-4 py-3 text-right text-amber-600 font-medium">
                                {formatCurrency(retainedAmount)}
                              </td>
                              <td className="px-4 py-3 text-right text-amber-500">
                                {totalRevenue > 0 ? `${((retainedAmount / totalRevenue) * 100).toFixed(1)}%` : '0%'}
                              </td>
                            </tr>
                          )}

                          {/* Distributable Pool - only show if retention > 0 */}
                          {retentionPercentage > 0 && (
                            <tr className="bg-blue-50/30">
                              <td className="px-4 py-3 font-medium text-blue-800">
                                Distributable Pool ({100 - retentionPercentage}%)
                              </td>
                              <td className="px-4 py-3 text-right text-blue-600 font-medium">
                                {formatCurrency(distributablePool)}
                              </td>
                              <td className="px-4 py-3 text-right text-blue-500">
                                {totalRevenue > 0 ? `${((distributablePool / totalRevenue) * 100).toFixed(1)}%` : '0%'}
                              </td>
                            </tr>
                          )}

                          {/* Partner Distribution - only show if partners exist */}
                          {activePartners.length > 0 && (
                            <>
                              <tr className="bg-purple-50/50">
                                <td className="px-4 py-3 font-semibold text-purple-800 flex items-center gap-2">
                                  <Users size={16} />
                                  Partner Share ({totalPartnerShare}% of {retentionPercentage > 0 ? 'distributable' : 'profit'})
                                </td>
                                <td className="px-4 py-3 text-right text-purple-600 font-medium">
                                  -{formatCurrency(partnerDistributionAmount)}
                                </td>
                                <td className="px-4 py-3 text-right text-purple-500">
                                  {totalRevenue > 0 ? `${((partnerDistributionAmount / totalRevenue) * 100).toFixed(1)}%` : '0%'}
                                </td>
                              </tr>

                              {/* Individual partner breakdown */}
                              {activePartners.map((partner) => (
                                <tr key={partner.id}>
                                  <td className="px-8 py-2 text-slate-600">{partner.name} ({partner.sharePercentage}%)</td>
                                  <td className="px-4 py-2 text-right text-slate-500">
                                    {formatCurrency((distributablePool * partner.sharePercentage) / 100)}
                                  </td>
                                  <td className="px-4 py-2 text-right text-slate-400">
                                    {totalRevenue > 0 ? `${(((distributablePool * partner.sharePercentage) / 100 / totalRevenue) * 100).toFixed(1)}%` : '0%'}
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}

                          <tr>
                            <td colSpan={3} className="h-4"></td>
                          </tr>

                          {/* Company Pool / Final Retained Earnings */}
                          <tr className="bg-emerald-50 border-t-2 border-emerald-100">
                            <td className="px-4 py-4 font-bold text-emerald-900 text-lg">Company Pool</td>
                            <td
                              className={`px-4 py-4 text-right font-bold text-lg ${
                                companyPoolAmount >= 0 ? 'text-emerald-700' : 'text-red-600'
                              }`}
                            >
                              {formatCurrency(companyPoolAmount)}
                            </td>
                            <td className="px-4 py-4 text-right font-medium text-emerald-600">
                              {totalRevenue > 0 ? `${((companyPoolAmount / totalRevenue) * 100).toFixed(1)}%` : '0%'}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={3} className="px-4 py-1">
                              <p className="text-xs text-slate-500">
                                {activePartners.length > 0
                                  ? 'Retained earnings after partner distributions'
                                  : retentionPercentage > 0
                                  ? `Reserved ${retentionPercentage}% + undistributed ${100 - retentionPercentage}% (no partners configured)`
                                  : 'Full profit retained (no partner distributions configured)'}
                              </p>
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <div className="space-y-6">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {expenseData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500">No expenses recorded</p>
                  </div>
                ) : (
                  <>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={expenseData} layout="vertical" margin={{ left: 20 }}>
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={80}
                            tick={{ fontSize: 12 }}
                            interval={0}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: 'transparent' }}
                            formatter={(value: number) => [formatCurrency(value), '']}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {expenseData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={categoryColors[entry.category] || '#6366f1'}
                                opacity={0.8}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                      {expenseData.slice(0, 3).map((item) => (
                        <div
                          key={item.category}
                          className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm text-slate-600"
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: categoryColors[item.category] || '#6366f1',
                            }}
                          ></div>
                          <span className="flex-1">{item.name}</span>
                          <span className="font-medium">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Bank Balance Card */}
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-emerald-100">
                  <Wallet size={20} />
                  Bank Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {bankBalance !== undefined ? (
                  <>
                    <div className="text-3xl font-bold mb-1">
                      {formatCurrency(bankBalance)}
                    </div>
                    {lastBankBalanceUpdate && (
                      <p className="text-emerald-200 text-xs">
                        Last updated: {lastBankBalanceUpdate}
                      </p>
                    )}
                  </>
                ) : (
                  <div>
                    <p className="text-emerald-200 text-sm mb-2">Not configured</p>
                    <Link
                      to="/settings"
                      className="inline-flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded transition-colors"
                    >
                      <Settings size={12} />
                      Configure in Settings
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default PnL;
