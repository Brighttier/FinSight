import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, Activity, Target, Loader2 } from 'lucide-react';
import { useCashFlow } from '../hooks/useTransactions';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { format } from 'date-fns';

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

const MetricCard = ({ title, value, change, trend, icon: Icon, loading }: any) => {
  const isPositive = trend === 'up';
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <Icon className="h-4 w-4 text-slate-400" />
        </div>
        {loading ? (
          <div className="flex items-center gap-2 mt-2">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            <span className="text-slate-400 text-sm">Loading...</span>
          </div>
        ) : (
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-bold">{value}</div>
            {change && (
              <span className={`text-xs font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'} flex items-center`}>
                {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                {change}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const { cashFlow, totals, loading: cashFlowLoading } = useCashFlow(30);
  const { subscriptions, metrics: subMetrics, loading: subsLoading } = useSubscriptions({ realtime: true });

  // Format chart data for display
  const chartData = cashFlow.map((point) => ({
    ...point,
    date: format(new Date(point.date), 'MMM d'),
  }));

  // Get upcoming bills (next 7 days)
  const upcomingBills = subMetrics.upcomingBills.slice(0, 3);

  // Calculate annual run rate from profit
  const annualRunRate = totals.profit * 12;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(totals.revenue)}
          trend="up"
          icon={DollarSign}
          loading={cashFlowLoading}
        />
        <MetricCard
          title="Expenses"
          value={formatCurrency(totals.expenses)}
          trend="down"
          icon={CreditCard}
          loading={cashFlowLoading}
        />
        <MetricCard
          title="Net Profit"
          value={formatCurrency(totals.profit)}
          trend={totals.profit >= 0 ? 'up' : 'down'}
          icon={Activity}
          loading={cashFlowLoading}
        />
        <MetricCard
          title="Monthly Subscriptions"
          value={formatCurrency(subMetrics.monthlyTotal)}
          change={subMetrics.activeCount > 0 ? `${subMetrics.activeCount} active` : undefined}
          trend="up"
          icon={Target}
          loading={subsLoading}
        />
      </div>

      {/* Main Chart Row */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4 lg:col-span-5">
          <CardHeader>
            <CardTitle>Cash Flow Trend (30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              {cashFlowLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <span className="text-slate-500">Loading chart data...</span>
                  </div>
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-slate-500">No transaction data yet</p>
                    <p className="text-sm text-slate-400 mt-1">Add transactions to see your cash flow</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      itemStyle={{ color: '#1e293b' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Side Panel: Alerts & Bills */}
        <Card className="col-span-3 lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>Intelligence & Alerts</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-6">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">AI Insights</h4>
              {subMetrics.potentialSavings > 0 ? (
                <div className="flex gap-3 items-start p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="bg-indigo-100 p-1.5 rounded-full text-indigo-600">
                    <Activity size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Subscription Savings</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Identified ${subMetrics.potentialSavings.toFixed(0)}/mo in potential savings.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="bg-slate-100 p-1.5 rounded-full text-slate-600">
                    <Activity size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">All Clear</p>
                    <p className="text-xs text-slate-600 mt-1">No issues detected. Keep up the good work!</p>
                  </div>
                </div>
              )}
              {totals.expenses > totals.revenue && totals.revenue > 0 && (
                <div className="flex gap-3 items-start p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="bg-amber-100 p-1.5 rounded-full text-amber-600">
                    <Activity size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Cash Flow Alert</p>
                    <p className="text-xs text-slate-600 mt-1">Expenses exceed revenue this period.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Upcoming Bills</h4>
              {subsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  <span className="text-slate-400 text-sm">Loading...</span>
                </div>
              ) : upcomingBills.length === 0 ? (
                <p className="text-sm text-slate-500">No upcoming bills in the next 7 days</p>
              ) : (
                <div className="space-y-2">
                  {upcomingBills.map((sub) => (
                    <div key={sub.id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                      <span className="text-slate-700">{sub.vendor}</span>
                      <div className="text-right">
                        <span className="block font-medium">${sub.cost.toFixed(2)}</span>
                        <span className="text-xs text-slate-500">
                          {format(new Date(sub.nextBillingDate), 'MMM d')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
