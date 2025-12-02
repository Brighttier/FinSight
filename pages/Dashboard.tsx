import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, Activity, Target, Loader2, AlertTriangle, Users, Briefcase, Calendar, TrendingUp, AlertCircle, Clock, ChevronRight, Building2, Handshake, Phone, Mail } from 'lucide-react';
import { useCashFlow } from '../hooks/useTransactions';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useContractors } from '../hooks/useContractors';
import { useRecruitment } from '../hooks/useRecruitment';
import { useCRM, DEAL_STAGE_LABELS, DEAL_STAGE_COLORS } from '../hooks/useCRM';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

type DashboardTab = 'financial' | 'recruitment' | 'crm';

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  trend: 'up' | 'down';
  icon: React.ElementType;
  loading?: boolean;
  color: 'green' | 'red' | 'blue' | 'purple';
}

const MetricCard = ({ title, value, change, trend, icon: Icon, loading, color }: MetricCardProps) => {
  const isPositive = trend === 'up';

  const colorStyles = {
    green: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-700',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      valueColor: 'text-red-700',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-700',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      valueColor: 'text-purple-700',
    },
  };

  const styles = colorStyles[color];

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-xl shadow-sm`}>
      <div className="p-5 flex items-center min-h-[100px]">
        <div className="flex items-center gap-4 w-full">
          <div className={`${styles.iconBg} p-3 rounded-xl flex-shrink-0`}>
            <Icon className={`h-6 w-6 ${styles.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-600 truncate">{title}</p>
            {loading ? (
              <div className="flex items-center gap-2 mt-1">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                <span className="text-slate-400 text-sm">Loading...</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-bold ${styles.valueColor}`}>{value}</span>
                {change && (
                  <span className={`text-xs font-medium flex items-center ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {change}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('financial');
  const { cashFlow, totals, loading: cashFlowLoading } = useCashFlow(30);
  const { subscriptions, metrics: subMetrics, loading: subsLoading } = useSubscriptions({ realtime: true });
  const { getExpiringContracts, loading: contractorsLoading } = useContractors({ realtime: true });
  const { funnelMetrics, recruiterMetrics, attentionItems, kpis, loading: recruitmentLoading } = useRecruitment({ realtime: true });
  const { clients, deals, pipelineMetrics, clientMetrics, activityMetrics, followUpReminders, kpis: crmKpis, loading: crmLoading } = useCRM({ realtime: true });

  // Format chart data for display
  const chartData = cashFlow.map((point) => ({
    ...point,
    date: format(new Date(point.date), 'MMM d'),
  }));

  // Get upcoming bills (next 7 days)
  const upcomingBills = subMetrics.upcomingBills.slice(0, 3);

  // Get contracts expiring within 30 days
  const expiringContracts = getExpiringContracts(30);

  // Calculate annual run rate from profit
  const annualRunRate = totals.profit * 12;

  // Funnel data for recruitment
  const funnelData = [
    { name: 'Submitted', value: funnelMetrics.submitted, fill: '#6366f1' },
    { name: 'In Review', value: funnelMetrics.inReview, fill: '#8b5cf6' },
    { name: 'Interviews', value: funnelMetrics.interviews, fill: '#a855f7' },
    { name: 'Offers', value: funnelMetrics.offers, fill: '#d946ef' },
    { name: 'Placed', value: funnelMetrics.placed, fill: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      {/* Dashboard Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('financial')}
            className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'financial'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign size={16} />
            Financial Overview
          </button>
          <button
            onClick={() => setActiveTab('recruitment')}
            className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'recruitment'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={16} />
            Recruitment
          </button>
          <button
            onClick={() => setActiveTab('crm')}
            className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'crm'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 size={16} />
            CRM
          </button>
        </nav>
      </div>

      {/* Financial Dashboard */}
      {activeTab === 'financial' && (
        <>
          {/* Metrics Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(totals.revenue)}
          trend="up"
          icon={DollarSign}
          loading={cashFlowLoading}
          color="green"
        />
        <MetricCard
          title="Expenses"
          value={formatCurrency(totals.expenses)}
          trend="down"
          icon={CreditCard}
          loading={cashFlowLoading}
          color="red"
        />
        <MetricCard
          title="Net Profit"
          value={formatCurrency(totals.profit)}
          trend={totals.profit >= 0 ? 'up' : 'down'}
          icon={Activity}
          loading={cashFlowLoading}
          color="blue"
        />
        <MetricCard
          title="Monthly Subscriptions"
          value={formatCurrency(subMetrics.monthlyTotal)}
          change={subMetrics.activeCount > 0 ? `${subMetrics.activeCount} active` : undefined}
          trend="up"
          icon={Target}
          loading={subsLoading}
          color="purple"
        />
      </div>

      {/* Main Chart Row */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4 lg:col-span-5">
          <CardHeader>
            <CardTitle>Cash Flow Trend (30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 pt-0">
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
          <CardContent className="flex-1 space-y-6 pt-0">
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

            {/* Expiring Contracts Alert */}
            {!contractorsLoading && expiringContracts.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Contract Alerts</h4>
                <div className="space-y-2">
                  {expiringContracts.slice(0, 3).map(({ assignment, daysLeft }) => (
                    <div
                      key={assignment.id}
                      className={`flex gap-3 items-start p-3 rounded-lg border ${
                        daysLeft <= 7
                          ? 'bg-red-50 border-red-100'
                          : daysLeft <= 14
                          ? 'bg-amber-50 border-amber-100'
                          : 'bg-orange-50 border-orange-100'
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-full ${
                          daysLeft <= 7
                            ? 'bg-red-100 text-red-600'
                            : daysLeft <= 14
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-orange-100 text-orange-600'
                        }`}
                      >
                        <AlertTriangle size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {assignment.contractorName}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Contract with {assignment.customerName} ends in{' '}
                          <span className={daysLeft <= 7 ? 'font-semibold text-red-600' : 'font-medium'}>
                            {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                  {expiringContracts.length > 3 && (
                    <p className="text-xs text-slate-500 text-center">
                      +{expiringContracts.length - 3} more expiring soon
                    </p>
                  )}
                </div>
              </div>
            )}

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
        </>
      )}

      {/* Recruitment Dashboard */}
      {activeTab === 'recruitment' && (
        <>
          {recruitmentLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              {/* KPI Widgets */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Active Submissions</p>
                        <p className="text-2xl font-bold text-blue-700">{kpis.activeSubmissions}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-purple-600 font-medium">Interviews This Week</p>
                        <p className="text-2xl font-bold text-purple-700">{kpis.interviewsThisWeek}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Briefcase className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-amber-600 font-medium">Pending Offers</p>
                        <p className="text-2xl font-bold text-amber-700">{kpis.pendingOffers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-50 border-emerald-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm text-emerald-600 font-medium">Placements (Quarter)</p>
                        <p className="text-2xl font-bold text-emerald-700">{kpis.placementsThisQuarter}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Row */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Recruitment Funnel */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Recruitment Funnel</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {funnelMetrics.total === 0 ? (
                      <div className="h-[300px] flex flex-col items-center justify-center text-slate-500">
                        <Users className="h-12 w-12 text-slate-300 mb-4" />
                        <p>No submissions yet</p>
                        <Link to="/recruitment" className="mt-2 text-indigo-600 hover:underline text-sm">
                          Go to Recruitment Pipeline
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Funnel Stages */}
                        <div className="space-y-2">
                          {funnelData.map((stage, index) => {
                            const percentage = funnelMetrics.total > 0
                              ? ((stage.value / funnelMetrics.total) * 100).toFixed(0)
                              : 0;
                            const widthPercent = Math.max(
                              20,
                              funnelMetrics.total > 0 ? (stage.value / funnelMetrics.total) * 100 : 0
                            );

                            return (
                              <div key={stage.name} className="flex items-center gap-4">
                                <div className="w-24 text-sm text-slate-600">{stage.name}</div>
                                <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                                  <div
                                    className="h-full rounded-lg transition-all duration-500"
                                    style={{
                                      width: `${widthPercent}%`,
                                      backgroundColor: stage.fill,
                                    }}
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-700">
                                    {stage.value} ({percentage}%)
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Conversion Rates */}
                        <div className="mt-6 pt-4 border-t border-slate-100">
                          <h4 className="text-sm font-semibold text-slate-500 mb-3">Conversion Rates</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-2 bg-slate-50 rounded-lg">
                              <p className="text-lg font-bold text-indigo-600">
                                {funnelMetrics.conversionRates.submitToReview.toFixed(0)}%
                              </p>
                              <p className="text-xs text-slate-500">Submit → Review</p>
                            </div>
                            <div className="text-center p-2 bg-slate-50 rounded-lg">
                              <p className="text-lg font-bold text-purple-600">
                                {funnelMetrics.conversionRates.reviewToInterview.toFixed(0)}%
                              </p>
                              <p className="text-xs text-slate-500">Review → Interview</p>
                            </div>
                            <div className="text-center p-2 bg-slate-50 rounded-lg">
                              <p className="text-lg font-bold text-pink-600">
                                {funnelMetrics.conversionRates.interviewToOffer.toFixed(0)}%
                              </p>
                              <p className="text-xs text-slate-500">Interview → Offer</p>
                            </div>
                            <div className="text-center p-2 bg-slate-50 rounded-lg">
                              <p className="text-lg font-bold text-emerald-600">
                                {funnelMetrics.conversionRates.offerToPlacement.toFixed(0)}%
                              </p>
                              <p className="text-xs text-slate-500">Offer → Placement</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recruiter Activity Leaderboard */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recruiter Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {recruiterMetrics.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">No recruiters yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recruiterMetrics.slice(0, 5).map((r, index) => (
                          <div key={r.recruiterId} className="flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-amber-100 text-amber-700' :
                              index === 1 ? 'bg-slate-200 text-slate-700' :
                              index === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate">{r.recruiterName}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                                <span>Submissions: <span className="font-medium text-slate-700">{r.thisWeekSubmissions}</span></span>
                                <span>Interviews: <span className="font-medium text-slate-700">{r.thisWeekInterviews}</span></span>
                                <span>Calls: <span className="font-medium text-slate-700">{r.thisWeekClientCalls}</span></span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Attention Needed Panel */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Attention Needed</CardTitle>
                  <Link
                    to="/recruitment"
                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    View All <ChevronRight size={14} />
                  </Link>
                </CardHeader>
                <CardContent className="pt-0">
                  {attentionItems.length === 0 ? (
                    <div className="text-center py-6 text-slate-500">
                      <Activity className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">All caught up! No items need attention.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {attentionItems.slice(0, 6).map((item, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            item.priority === 'high'
                              ? 'bg-red-50 border-red-200'
                              : item.priority === 'medium'
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`p-1 rounded ${
                              item.priority === 'high'
                                ? 'bg-red-100 text-red-600'
                                : item.priority === 'medium'
                                ? 'bg-amber-100 text-amber-600'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.type === 'stale' && <Clock size={12} />}
                              {item.type === 'upcoming_interview' && <Calendar size={12} />}
                              {item.type === 'no_activity' && <AlertCircle size={12} />}
                              {item.type === 'pending_offer' && <Briefcase size={12} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                              <p className="text-xs text-slate-600 mt-0.5">{item.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* CRM Dashboard */}
      {activeTab === 'crm' && (
        <>
          {crmLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              {/* KPI Widgets */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Total Clients</p>
                        <p className="text-2xl font-bold text-blue-700">{crmKpis.totalClients}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-50 border-emerald-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <Handshake className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm text-emerald-600 font-medium">Active Clients</p>
                        <p className="text-2xl font-bold text-emerald-700">{crmKpis.activeClients}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Target className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-purple-600 font-medium">Open Deals</p>
                        <p className="text-2xl font-bold text-purple-700">{crmKpis.openDeals}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-indigo-50 border-indigo-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm text-indigo-600 font-medium">Pipeline Value</p>
                        <p className="text-2xl font-bold text-indigo-700">{formatCurrency(crmKpis.pipelineValue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Row */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Deal Pipeline */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Deal Pipeline</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {pipelineMetrics.totalDeals === 0 ? (
                      <div className="h-[300px] flex flex-col items-center justify-center text-slate-500">
                        <Target className="h-12 w-12 text-slate-300 mb-4" />
                        <p>No deals yet</p>
                        <Link to="/crm" className="mt-2 text-indigo-600 hover:underline text-sm">
                          Go to CRM
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Pipeline Stages */}
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                          {(['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as const).map((stage) => (
                            <div
                              key={stage}
                              className={`p-3 rounded-lg ${DEAL_STAGE_COLORS[stage].bg} border`}
                            >
                              <p className={`text-2xl font-bold ${DEAL_STAGE_COLORS[stage].text}`}>
                                {pipelineMetrics.stageCounts[stage]}
                              </p>
                              <p className="text-xs text-slate-600 truncate">{DEAL_STAGE_LABELS[stage]}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                {formatCurrency(pipelineMetrics.stageValues[stage])}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Pipeline Summary */}
                        <div className="mt-6 pt-4 border-t border-slate-100">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                              <p className="text-lg font-bold text-slate-900">
                                {formatCurrency(pipelineMetrics.totalPipelineValue)}
                              </p>
                              <p className="text-xs text-slate-500">Total Pipeline</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                              <p className="text-lg font-bold text-indigo-600">
                                {formatCurrency(pipelineMetrics.weightedPipelineValue)}
                              </p>
                              <p className="text-xs text-slate-500">Weighted Value</p>
                            </div>
                            <div className="text-center p-3 bg-emerald-50 rounded-lg">
                              <p className="text-lg font-bold text-emerald-600">
                                {pipelineMetrics.winRate.toFixed(0)}%
                              </p>
                              <p className="text-xs text-slate-500">Win Rate</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                              <p className="text-lg font-bold text-slate-900">
                                {pipelineMetrics.openDeals}
                              </p>
                              <p className="text-xs text-slate-500">Open Deals</p>
                            </div>
                          </div>
                        </div>

                        {/* Recent Deals */}
                        {deals.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-slate-100">
                            <h4 className="text-sm font-semibold text-slate-500 mb-3">Recent Deals</h4>
                            <div className="space-y-2">
                              {deals.slice(0, 5).map((deal) => (
                                <div key={deal.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">{deal.title}</p>
                                    <p className="text-xs text-slate-500">{deal.clientName}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${DEAL_STAGE_COLORS[deal.stage].bg} ${DEAL_STAGE_COLORS[deal.stage].text}`}>
                                      {DEAL_STAGE_LABELS[deal.stage]}
                                    </span>
                                    <span className="font-medium text-slate-900">{formatCurrency(deal.value)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Follow-up Reminders & Client Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Follow-ups & Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-6">
                    {/* Follow-up Reminders */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500 mb-3">Follow-up Reminders</h4>
                      {followUpReminders.length === 0 ? (
                        <div className="text-center py-4 text-slate-500">
                          <Clock className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm">No pending follow-ups</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {followUpReminders.slice(0, 5).map((reminder) => (
                            <Link
                              key={reminder.clientId}
                              to="/crm"
                              className={`block p-2 rounded-lg transition-colors ${
                                reminder.type === 'overdue'
                                  ? 'bg-red-50 hover:bg-red-100 border border-red-200'
                                  : reminder.type === 'today'
                                  ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200'
                                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {reminder.type === 'overdue' && <AlertCircle size={12} className="text-red-500" />}
                                {reminder.type === 'today' && <Clock size={12} className="text-amber-500" />}
                                {reminder.type === 'upcoming' && <Calendar size={12} className="text-slate-400" />}
                                <p className="text-sm font-medium text-slate-900 truncate">{reminder.clientName}</p>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 pl-4">
                                {reminder.type === 'overdue'
                                  ? `${reminder.daysDiff} days overdue`
                                  : reminder.type === 'today'
                                  ? 'Due today'
                                  : `Due in ${reminder.daysDiff} days`}
                              </p>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Client Breakdown */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500 mb-3">Client Breakdown</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                          <span className="text-sm text-slate-600">Active</span>
                          <span className="font-bold text-green-700">{clientMetrics.typeCounts.active}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                          <span className="text-sm text-slate-600">Prospects</span>
                          <span className="font-bold text-blue-700">{clientMetrics.typeCounts.prospect}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-600">Inactive</span>
                          <span className="font-bold text-slate-700">{clientMetrics.typeCounts.inactive}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                          <span className="text-sm text-slate-600">Churned</span>
                          <span className="font-bold text-red-700">{clientMetrics.typeCounts.churned}</span>
                        </div>
                      </div>
                    </div>

                    {/* Service Usage */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500 mb-3">Service Usage</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                          <span className="text-sm text-slate-600">Contractor Services</span>
                          <span className="font-bold text-blue-700">{clientMetrics.withContractorServices}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg">
                          <span className="text-sm text-slate-600">Recruitment Services</span>
                          <span className="font-bold text-purple-700">{clientMetrics.withRecruitmentServices}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-indigo-50 rounded-lg">
                          <span className="text-sm text-slate-600">Both Services</span>
                          <span className="font-bold text-indigo-700">{clientMetrics.withBothServices}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Activity This Month */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Activity This Month</CardTitle>
                  <Link
                    to="/crm"
                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    View All <ChevronRight size={14} />
                  </Link>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Phone className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{activityMetrics.interactionTypeCounts.call}</p>
                        <p className="text-xs text-slate-500">Calls</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Mail className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{activityMetrics.interactionTypeCounts.email}</p>
                        <p className="text-xs text-slate-500">Emails</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{activityMetrics.interactionTypeCounts.meeting}</p>
                        <p className="text-xs text-slate-500">Meetings</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Activity className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{activityMetrics.thisMonthInteractions}</p>
                        <p className="text-xs text-slate-500">Total Interactions</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
