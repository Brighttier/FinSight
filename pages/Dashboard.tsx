import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  CreditCard,
  Activity,
  Target,
  Loader2,
  AlertTriangle,
  Users,
  Briefcase,
  Calendar,
  TrendingUp,
  AlertCircle,
  Clock,
  ChevronRight,
  Building2,
  Handshake,
  PlusCircle,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Upload,
  Download,
  LogIn,
  LogOut,
  UserPlus,
  FileText,
  RefreshCw,
  Eye,
  Filter,
  MoreVertical,
} from 'lucide-react';
import { useCashFlow } from '../hooks/useTransactions';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useContractors } from '../hooks/useContractors';
import { useRecruitment } from '../hooks/useRecruitment';
import { useCRM, DEAL_STAGE_LABELS, DEAL_STAGE_COLORS } from '../hooks/useCRM';
import { useActivityLog, getActivityColor } from '../hooks/useActivityLog';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { format, formatDistanceToNow, isToday, isYesterday, startOfDay, isSameDay } from 'date-fns';
import { Link } from 'react-router-dom';
import type { ActivityLog, ActivityAction, ActivityModule } from '../types';

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
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  loading?: boolean;
  color: 'green' | 'red' | 'blue' | 'purple' | 'amber' | 'indigo' | 'slate';
  link?: string;
}

const MetricCard = ({ title, value, change, trend, icon: Icon, loading, color, link }: MetricCardProps) => {
  const colorStyles = {
    green: { bg: 'bg-emerald-50', border: 'border-emerald-200', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', valueColor: 'text-emerald-700' },
    red: { bg: 'bg-red-50', border: 'border-red-200', iconBg: 'bg-red-100', iconColor: 'text-red-600', valueColor: 'text-red-700' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', valueColor: 'text-blue-700' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', valueColor: 'text-purple-700' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', valueColor: 'text-amber-700' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', valueColor: 'text-indigo-700' },
    slate: { bg: 'bg-slate-50', border: 'border-slate-200', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', valueColor: 'text-slate-700' },
  };

  const styles = colorStyles[color];

  const content = (
    <div className={`${styles.bg} ${styles.border} border rounded-xl shadow-sm ${link ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
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
                  <span className={`text-xs font-medium flex items-center ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500'}`}>
                    {trend === 'up' && <ArrowUpRight className="h-3 w-3" />}
                    {trend === 'down' && <ArrowDownRight className="h-3 w-3" />}
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

  if (link) {
    return <Link to={link}>{content}</Link>;
  }
  return content;
};

// Activity Timeline Item Component
const ActivityIcon = ({ action }: { action: ActivityAction }) => {
  const iconMap: Record<ActivityAction, React.ElementType> = {
    create: PlusCircle,
    update: Edit,
    delete: Trash2,
    view: Eye,
    submit: Send,
    approve: CheckCircle,
    reject: XCircle,
    complete: CheckCircle,
    cancel: XCircle,
    upload: Upload,
    download: Download,
    login: LogIn,
    logout: LogOut,
  };
  const Icon = iconMap[action] || Activity;
  return <Icon size={14} />;
};

interface ActivityTimelineItemProps {
  activity: ActivityLog;
  isLast: boolean;
}

const ActivityTimelineItem = ({ activity, isLast }: ActivityTimelineItemProps) => {
  const colorClass = getActivityColor(activity.action);
  const timeAgo = activity.timestamp ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }) : '';
  const exactTime = activity.timestamp ? format(new Date(activity.timestamp), 'h:mm a') : '';

  return (
    <div className="flex gap-3">
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          <ActivityIcon action={activity.action} />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 mt-1" />}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-4 ${isLast ? '' : 'border-b border-transparent'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-900">{activity.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">{activity.userName}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-400" title={exactTime}>{timeAgo}</span>
            </div>
          </div>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colorClass}`}>
            {activity.module.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
};

// Group activities by date
const groupActivitiesByDate = (activities: ActivityLog[]) => {
  const groups: { label: string; date: Date; activities: ActivityLog[] }[] = [];
  const today = startOfDay(new Date());

  activities.forEach((activity) => {
    if (!activity.timestamp) return;
    const activityDate = startOfDay(new Date(activity.timestamp));
    let label = format(activityDate, 'EEEE, MMMM d');

    if (isToday(activityDate)) {
      label = 'Today';
    } else if (isYesterday(activityDate)) {
      label = 'Yesterday';
    }

    const existingGroup = groups.find((g) => isSameDay(g.date, activityDate));
    if (existingGroup) {
      existingGroup.activities.push(activity);
    } else {
      groups.push({ label, date: activityDate, activities: [activity] });
    }
  });

  return groups.sort((a, b) => b.date.getTime() - a.date.getTime());
};

const Dashboard = () => {
  const [activityFilter, setActivityFilter] = useState<ActivityModule | 'all'>('all');
  const [showAlertDetails, setShowAlertDetails] = useState(false);
  const alertDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (alertDropdownRef.current && !alertDropdownRef.current.contains(event.target as Node)) {
        setShowAlertDetails(false);
      }
    };

    if (showAlertDetails) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAlertDetails]);

  const { cashFlow, totals, loading: cashFlowLoading } = useCashFlow(30);
  const { metrics: subMetrics, loading: subsLoading } = useSubscriptions({ realtime: true });
  const { contractors, assignments, getExpiringContracts, loading: contractorsLoading } = useContractors({ realtime: true });
  const { funnelMetrics, kpis, attentionItems, loading: recruitmentLoading } = useRecruitment({ realtime: true });
  const { clients, deals, pipelineMetrics, kpis: crmKpis, followUpReminders, loading: crmLoading } = useCRM({ realtime: true });
  const { activities, loading: activitiesLoading } = useActivityLog({ realtime: true, limit: 100 });
  const { teamMembers, loading: teamLoading } = useTeamMembers({ realtime: true });

  // Filter activities
  const filteredActivities = useMemo(() => {
    if (activityFilter === 'all') return activities;
    return activities.filter((a) => a.module === activityFilter);
  }, [activities, activityFilter]);

  // Group activities by date
  const groupedActivities = useMemo(() => groupActivitiesByDate(filteredActivities), [filteredActivities]);

  // Format chart data
  const chartData = cashFlow.map((point) => ({
    ...point,
    date: format(new Date(point.date), 'MMM d'),
  }));

  // Get expiring contracts
  const expiringContracts = getExpiringContracts(30);

  // Calculate summary metrics
  const activeContractors = contractors.filter((c) => c.status === 'active').length;
  const activeAssignments = assignments.filter((a) => a.status === 'active').length;
  const activeTeamMembers = teamMembers.filter((t) => t.status === 'active').length;

  // Pie chart data for expense breakdown
  const expenseBreakdown = [
    { name: 'Subscriptions', value: subMetrics.monthlyTotal, color: '#8b5cf6' },
    { name: 'Contractors', value: totals.expenses * 0.4, color: '#f59e0b' },
    { name: 'Payroll', value: totals.expenses * 0.35, color: '#3b82f6' },
    { name: 'Other', value: totals.expenses * 0.25, color: '#6b7280' },
  ].filter((e) => e.value > 0);

  // Count alerts
  const alertCount =
    expiringContracts.length +
    (subMetrics.upcomingBills.length > 0 ? 1 : 0) +
    attentionItems.filter((i) => i.priority === 'high').length +
    followUpReminders.filter((r) => r.type === 'overdue').length;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Everything at a glance • {format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        {alertCount > 0 && (
          <div className="relative" ref={alertDropdownRef}>
            <button
              onClick={() => setShowAlertDetails(!showAlertDetails)}
              className="relative flex items-center gap-2 px-4 py-2 bg-red-500 border border-red-600 rounded-full shadow-lg animate-pulse cursor-pointer hover:bg-red-600 transition-colors"
            >
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-300"></span>
              </span>
              <AlertCircle className="h-5 w-5 text-white" />
              <span className="text-sm font-bold text-white">{alertCount} item{alertCount > 1 ? 's' : ''} need attention</span>
              <ChevronRight className={`h-4 w-4 text-white transition-transform ${showAlertDetails ? 'rotate-90' : ''}`} />
            </button>

            {/* Alert Details Dropdown */}
            {showAlertDetails && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 bg-red-50 border-b border-red-100">
                  <p className="text-sm font-semibold text-red-800">Items Requiring Attention</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {/* Expiring Contracts */}
                  {expiringContracts.length > 0 && (
                    <div className="border-b border-slate-100">
                      <div className="px-3 py-2 bg-slate-50">
                        <p className="text-xs font-semibold text-slate-600 uppercase">Expiring Contracts ({expiringContracts.length})</p>
                      </div>
                      {expiringContracts.map(({ assignment, daysLeft }) => (
                        <Link
                          key={assignment.id}
                          to="/contractors"
                          onClick={() => setShowAlertDetails(false)}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors"
                        >
                          <div className={`p-1.5 rounded-full ${daysLeft <= 7 ? 'bg-red-100' : 'bg-amber-100'}`}>
                            <Clock className={`h-3.5 w-3.5 ${daysLeft <= 7 ? 'text-red-600' : 'text-amber-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{assignment.contractorName}</p>
                            <p className="text-xs text-slate-500">{daysLeft <= 7 ? 'Urgent: ' : ''}Ends in {daysLeft} days</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Overdue Follow-ups */}
                  {followUpReminders.filter((r) => r.type === 'overdue').length > 0 && (
                    <div className="border-b border-slate-100">
                      <div className="px-3 py-2 bg-slate-50">
                        <p className="text-xs font-semibold text-slate-600 uppercase">Overdue Follow-ups ({followUpReminders.filter((r) => r.type === 'overdue').length})</p>
                      </div>
                      {followUpReminders.filter((r) => r.type === 'overdue').map((reminder) => (
                        <Link
                          key={reminder.clientId}
                          to="/crm"
                          onClick={() => setShowAlertDetails(false)}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors"
                        >
                          <div className="p-1.5 rounded-full bg-red-100">
                            <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{reminder.clientName}</p>
                            <p className="text-xs text-slate-500">{reminder.daysDiff} days overdue</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* High Priority Recruitment Items */}
                  {attentionItems.filter((i) => i.priority === 'high').length > 0 && (
                    <div className="border-b border-slate-100">
                      <div className="px-3 py-2 bg-slate-50">
                        <p className="text-xs font-semibold text-slate-600 uppercase">Recruitment Alerts ({attentionItems.filter((i) => i.priority === 'high').length})</p>
                      </div>
                      {attentionItems.filter((i) => i.priority === 'high').map((item, idx) => (
                        <Link
                          key={idx}
                          to="/recruitment"
                          onClick={() => setShowAlertDetails(false)}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors"
                        >
                          <div className="p-1.5 rounded-full bg-red-100">
                            <Briefcase className="h-3.5 w-3.5 text-red-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                            <p className="text-xs text-slate-500">{item.description}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Upcoming Bills */}
                  {subMetrics.upcomingBills.length > 0 && (
                    <div>
                      <div className="px-3 py-2 bg-slate-50">
                        <p className="text-xs font-semibold text-slate-600 uppercase">Upcoming Bills ({subMetrics.upcomingBills.length})</p>
                      </div>
                      {subMetrics.upcomingBills.map((sub) => (
                        <Link
                          key={sub.id}
                          to="/subscriptions"
                          onClick={() => setShowAlertDetails(false)}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors"
                        >
                          <div className="p-1.5 rounded-full bg-blue-100">
                            <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{sub.vendor}</p>
                            <p className="text-xs text-slate-500">${sub.cost.toFixed(0)} due {format(new Date(sub.nextBillingDate), 'MMM d')}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Metrics Grid - All at a glance */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <MetricCard title="Total Revenue" value={formatCurrency(totals.revenue)} trend="up" icon={DollarSign} loading={cashFlowLoading} color="green" link="/pnl" />
        <MetricCard title="Total Expenses" value={formatCurrency(totals.expenses)} trend="down" icon={CreditCard} loading={cashFlowLoading} color="red" link="/pnl" />
        <MetricCard title="Net Profit" value={formatCurrency(totals.profit)} trend={totals.profit >= 0 ? 'up' : 'down'} icon={Activity} loading={cashFlowLoading} color={totals.profit >= 0 ? 'blue' : 'red'} link="/pnl" />
        <MetricCard title="Subscriptions" value={formatCurrency(subMetrics.monthlyTotal)} change={`${subMetrics.activeCount} active`} trend="neutral" icon={Target} loading={subsLoading} color="purple" link="/subscriptions" />
      </div>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <MetricCard title="Contractors" value={String(activeContractors)} change={`${activeAssignments} assignments`} trend="neutral" icon={Users} loading={contractorsLoading} color="amber" link="/contractors" />
        <MetricCard title="Team Members" value={String(activeTeamMembers)} trend="neutral" icon={UserPlus} loading={teamLoading} color="indigo" link="/team" />
        <MetricCard title="Pipeline Value" value={formatCurrency(crmKpis.pipelineValue)} change={`${crmKpis.openDeals} deals`} trend="up" icon={Handshake} loading={crmLoading} color="blue" link="/crm" />
        <MetricCard title="Submissions" value={String(kpis.activeSubmissions)} change={`${kpis.placementsThisQuarter} placed`} trend="up" icon={Briefcase} loading={recruitmentLoading} color="purple" link="/recruitment" />
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Charts & Summaries */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cash Flow Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Cash Flow Trend (30 Days)</CardTitle>
                <Link to="/pnl" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  View P&L <ChevronRight size={12} />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[200px] w-full">
                {cashFlowLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <p className="text-slate-500 text-sm">No data yet</p>
                      <Link to="/costs/new" className="text-xs text-indigo-600 hover:underline">Add transactions</Link>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
                      <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recruitment Summary */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recruitment Pipeline</CardTitle>
                  <Link to="/recruitment" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    View <ChevronRight size={12} />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {recruitmentLoading ? (
                  <div className="py-6 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Submissions</span>
                      <span className="font-bold text-indigo-600">{funnelMetrics.submitted}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">In Review</span>
                      <span className="font-bold text-purple-600">{funnelMetrics.inReview}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Interviews</span>
                      <span className="font-bold text-amber-600">{funnelMetrics.interviews}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Offers</span>
                      <span className="font-bold text-pink-600">{funnelMetrics.offers}</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-sm font-medium text-slate-700">Placed</span>
                      <span className="font-bold text-emerald-600">{funnelMetrics.placed}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CRM Summary */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Deal Pipeline</CardTitle>
                  <Link to="/crm" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    View <ChevronRight size={12} />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {crmLoading ? (
                  <div className="py-6 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Leads</span>
                      <span className="font-bold text-slate-600">{pipelineMetrics.stageCounts.lead}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Qualified</span>
                      <span className="font-bold text-blue-600">{pipelineMetrics.stageCounts.qualified}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Proposal</span>
                      <span className="font-bold text-purple-600">{pipelineMetrics.stageCounts.proposal}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Negotiation</span>
                      <span className="font-bold text-amber-600">{pipelineMetrics.stageCounts.negotiation}</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-sm font-medium text-slate-700">Won</span>
                      <span className="font-bold text-emerald-600">{pipelineMetrics.stageCounts.closed_won}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Alerts Section */}
          {(expiringContracts.length > 0 || subMetrics.upcomingBills.length > 0 || attentionItems.length > 0 || followUpReminders.filter((r) => r.type === 'overdue').length > 0) && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Attention Required
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-2 md:grid-cols-2">
                  {/* Contract Alerts */}
                  {expiringContracts.slice(0, 3).map(({ assignment, daysLeft }) => (
                    <div key={assignment.id} className={`flex items-center gap-2 p-2 rounded-lg ${daysLeft <= 7 ? 'bg-red-100' : 'bg-amber-100'}`}>
                      <Clock className={`h-4 w-4 ${daysLeft <= 7 ? 'text-red-600' : 'text-amber-600'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate">{assignment.contractorName}</p>
                        <p className="text-xs text-slate-600">Contract ends in {daysLeft} days</p>
                      </div>
                    </div>
                  ))}

                  {/* Overdue Follow-ups */}
                  {followUpReminders.filter((r) => r.type === 'overdue').slice(0, 2).map((reminder) => (
                    <div key={reminder.clientId} className="flex items-center gap-2 p-2 rounded-lg bg-red-100">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate">{reminder.clientName}</p>
                        <p className="text-xs text-slate-600">Follow-up {reminder.daysDiff} days overdue</p>
                      </div>
                    </div>
                  ))}

                  {/* High Priority Recruitment Items */}
                  {attentionItems.filter((i) => i.priority === 'high').slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-red-100">
                      <Briefcase className="h-4 w-4 text-red-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate">{item.title}</p>
                        <p className="text-xs text-slate-600">{item.description}</p>
                      </div>
                    </div>
                  ))}

                  {/* Upcoming Bills */}
                  {subMetrics.upcomingBills.slice(0, 2).map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 p-2 rounded-lg bg-blue-100">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate">{sub.vendor}</p>
                        <p className="text-xs text-slate-600">${sub.cost.toFixed(0)} due {format(new Date(sub.nextBillingDate), 'MMM d')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Activity Timeline (Jira-style) */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-2 sticky top-0 bg-white z-10 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-600" />
                  Activity Timeline
                </CardTitle>
                <div className="flex items-center gap-2">
                  <select
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value as ActivityModule | 'all')}
                    className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Activities</option>
                    <option value="transactions">Transactions</option>
                    <option value="subscriptions">Subscriptions</option>
                    <option value="contractors">Contractors</option>
                    <option value="team_payroll">Team & Payroll</option>
                    <option value="recruitment">Recruitment</option>
                    <option value="crm">CRM</option>
                    <option value="settings">Settings</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 overflow-y-auto max-h-[calc(100vh-280px)]">
              {activitiesLoading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mb-2" />
                  <span className="text-sm text-slate-500">Loading activity...</span>
                </div>
              ) : groupedActivities.length === 0 ? (
                <div className="py-12 text-center">
                  <Activity className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No activity recorded yet</p>
                  <p className="text-xs text-slate-400 mt-1">Activity will appear here as you use the app</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedActivities.map((group) => (
                    <div key={group.label}>
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{group.label}</span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>
                      <div className="space-y-0">
                        {group.activities.map((activity, idx) => (
                          <ActivityTimelineItem
                            key={activity.id}
                            activity={activity}
                            isLast={idx === group.activities.length - 1}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-xs font-medium">Annual Run Rate</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totals.profit * 12)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-indigo-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs font-medium">Win Rate</p>
                <p className="text-2xl font-bold mt-1">{pipelineMetrics.winRate.toFixed(0)}%</p>
              </div>
              <Target className="h-8 w-8 text-emerald-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-xs font-medium">Placements (QTD)</p>
                <p className="text-2xl font-bold mt-1">{kpis.placementsThisQuarter}</p>
              </div>
              <Briefcase className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs font-medium">Active Clients</p>
                <p className="text-2xl font-bold mt-1">{crmKpis.activeClients}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
