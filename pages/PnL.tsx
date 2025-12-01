import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, Download } from 'lucide-react';
import { usePnL } from '../hooks/useTransactions';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';

type DateRange = 'thisMonth' | 'lastMonth' | 'ytd';

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
  other: 'Other',
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
  other: '#64748b',
};

const PnL = () => {
  const [dateRange, setDateRange] = useState<DateRange>('thisMonth');

  // Calculate date range
  const { startDate, endDate, label } = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'thisMonth':
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
          label: format(now, 'MMM yyyy'),
        };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return {
          startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
          label: format(lastMonth, 'MMM yyyy'),
        };
      case 'ytd':
        return {
          startDate: format(startOfYear(now), 'yyyy-MM-dd'),
          endDate: format(now, 'yyyy-MM-dd'),
          label: 'Year to Date',
        };
    }
  }, [dateRange]);

  const { revenue, expenses, profit, expensesByCategory, loading } = usePnL(startDate, endDate);

  // Prepare expense breakdown data for chart
  const expenseData = useMemo(() => {
    return Object.entries(expensesByCategory)
      .map(([category, value]) => ({
        name: categoryLabels[category] || category,
        value,
        category,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [expensesByCategory]);

  // Calculate percentages
  const revenuePercent = 100;
  const expensePercent = revenue > 0 ? ((expenses / revenue) * 100).toFixed(1) : 0;
  const profitPercent = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleExport = () => {
    const csvData = [
      ['Category', 'Amount', '% of Revenue'],
      ['Total Revenue', revenue.toString(), '100%'],
      ['Total Expenses', expenses.toString(), `${expensePercent}%`],
      ...Object.entries(expensesByCategory).map(([cat, val]) => [
        categoryLabels[cat] || cat,
        val.toString(),
        revenue > 0 ? `${((val / revenue) * 100).toFixed(1)}%` : '0%',
      ]),
      ['Net Profit', profit.toString(), `${profitPercent}%`],
    ];

    const csv = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pnl-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">P&L Statement</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md p-1">
            <button
              onClick={() => setDateRange('thisMonth')}
              className={`px-3 py-1.5 text-sm font-medium rounded ${
                dateRange === 'thisMonth'
                  ? 'bg-slate-100 text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateRange('lastMonth')}
              className={`px-3 py-1.5 text-sm font-medium rounded ${
                dateRange === 'lastMonth'
                  ? 'bg-slate-100 text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setDateRange('ytd')}
              className={`px-3 py-1.5 text-sm font-medium rounded ${
                dateRange === 'ytd'
                  ? 'bg-slate-100 text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              YTD
            </button>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {loading ? (
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
            <CardContent>
              {revenue === 0 && expenses === 0 ? (
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
                          {formatCurrency(revenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">100%</td>
                      </tr>

                      <tr>
                        <td colSpan={3} className="h-4"></td>
                      </tr>

                      {/* Expenses Section */}
                      <tr className="bg-red-50/30">
                        <td className="px-4 py-3 font-semibold text-slate-800">Total Expenses</td>
                        <td className="px-4 py-3 text-right text-red-600">
                          {formatCurrency(expenses)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">{expensePercent}%</td>
                      </tr>

                      {/* Expense breakdown */}
                      {Object.entries(expensesByCategory)
                        .sort(([, a], [, b]) => b - a)
                        .map(([category, value]) => (
                          <tr key={category}>
                            <td className="px-8 py-2 text-slate-600">
                              {categoryLabels[category] || category}
                            </td>
                            <td className="px-4 py-2 text-right">{formatCurrency(value)}</td>
                            <td className="px-4 py-2 text-right text-slate-400">
                              {revenue > 0 ? `${((value / revenue) * 100).toFixed(1)}%` : '0%'}
                            </td>
                          </tr>
                        ))}

                      <tr>
                        <td colSpan={3} className="h-4"></td>
                      </tr>

                      {/* Net Profit */}
                      <tr className="bg-indigo-50 border-t-2 border-indigo-100">
                        <td className="px-4 py-4 font-bold text-indigo-900 text-lg">Net Profit</td>
                        <td
                          className={`px-4 py-4 text-right font-bold text-lg ${
                            profit >= 0 ? 'text-indigo-700' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(profit)}
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-indigo-600">
                          {profitPercent}%
                        </td>
                      </tr>
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
              <CardContent>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default PnL;
