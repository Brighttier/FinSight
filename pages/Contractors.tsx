import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  X,
  Users,
  Building2,
  Briefcase,
  Calendar,
  TrendingUp,
  DollarSign,
  ChevronDown,
  FileSpreadsheet,
  Upload,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { useContractors } from '../hooks/useContractors';
import { useAuth } from '../contexts/AuthContext';
import { uploadContractFile, validateContractFile } from '../services/storageService';
import {
  getCurrencyOptions,
  getExchangeRate,
  convertToUSD,
  formatCurrencyAmount,
  initializeExchangeRates,
} from '../services/currencyService';
import type {
  CustomerInput,
  ContractorInput,
  ContractorAssignment,
  ContractorTimesheet,
  CurrencyCode,
} from '../types';
import { SUPPORTED_CURRENCIES } from '../types';
import { format, subMonths } from 'date-fns';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

type TabType = 'contractors' | 'customers' | 'assignments' | 'timesheets' | 'analytics';
type FilterPeriod = 'month' | 'quarter' | 'ytd' | 'all';

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getCurrentMonth = () => format(new Date(), 'yyyy-MM');
const getCurrentQuarter = () => {
  const month = new Date().getMonth();
  if (month < 3) return 'Q1';
  if (month < 6) return 'Q2';
  if (month < 9) return 'Q3';
  return 'Q4';
};
const getCurrentYear = () => format(new Date(), 'yyyy');

const Contractors = () => {
  const { user } = useAuth();
  const {
    customers,
    contractors,
    assignments,
    timesheets,
    loading,
    addCustomer,
    editCustomer,
    removeCustomer,
    addContractor,
    editContractor,
    removeContractor,
    addAssignment,
    editAssignment,
    removeAssignment,
    addTimesheet,
    editTimesheet,
    removeTimesheet,
    generateTimesheetsForMonth,
    calculateMetrics,
    getMetricsByContractor,
    getMetricsByCustomer,
    projectFutureRevenue,
  } = useContractors({ realtime: true });

  const [activeTab, setActiveTab] = useState<TabType>('contractors');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedQuarter, setSelectedQuarter] = useState(getCurrentQuarter());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Contractor form
  const [contractorName, setContractorName] = useState('');
  const [contractorEmail, setContractorEmail] = useState('');
  const [contractorPhone, setContractorPhone] = useState('');
  const [contractorSkills, setContractorSkills] = useState('');
  const [contractorStatus, setContractorStatus] = useState<'active' | 'inactive'>('active');

  // Customer form
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerStatus, setCustomerStatus] = useState<'active' | 'inactive'>('active');

  // Assignment form
  const [assignContractorId, setAssignContractorId] = useState('');
  const [assignCustomerId, setAssignCustomerId] = useState('');
  const [assignCustomerContactEmail, setAssignCustomerContactEmail] = useState('');
  const [assignInternalRate, setAssignInternalRate] = useState('');
  const [assignInternalCurrency, setAssignInternalCurrency] = useState<CurrencyCode>('USD');
  const [assignExternalRate, setAssignExternalRate] = useState('');
  const [assignExternalCurrency, setAssignExternalCurrency] = useState<CurrencyCode>('USD');
  const [assignStartDate, setAssignStartDate] = useState('');
  const [assignEndDate, setAssignEndDate] = useState('');
  const [assignStatus, setAssignStatus] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignContractFile, setAssignContractFile] = useState<File | null>(null);
  const [assignContractFileUrl, setAssignContractFileUrl] = useState('');
  const [assignContractFileName, setAssignContractFileName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize exchange rates on mount
  useEffect(() => {
    initializeExchangeRates();
  }, []);

  // Calculate margin preview with currency conversion
  const marginPreview = useMemo(() => {
    if (!assignInternalRate || !assignExternalRate) return null;
    const internalRateUSD = convertToUSD(parseFloat(assignInternalRate), assignInternalCurrency);
    const externalRateUSD = parseFloat(assignExternalRate); // External is always USD
    const margin = externalRateUSD - internalRateUSD;
    const marginPercent = externalRateUSD > 0 ? (margin / externalRateUSD) * 100 : 0;
    return { margin, marginPercent, internalRateUSD };
  }, [assignInternalRate, assignInternalCurrency, assignExternalRate]);

  // Timesheet form
  const [tsAssignmentId, setTsAssignmentId] = useState('');
  const [tsMonth, setTsMonth] = useState(getCurrentMonth());
  const [tsStandardDays, setTsStandardDays] = useState('20');
  const [tsOvertimeDays, setTsOvertimeDays] = useState('0');
  const [tsOvertimeHours, setTsOvertimeHours] = useState('0');
  const [tsStatus, setTsStatus] = useState<'draft' | 'submitted' | 'approved'>('draft');

  // Calculate metrics based on filter
  const metrics = useMemo(() => {
    if (filterPeriod === 'month') {
      return calculateMetrics(selectedMonth);
    } else if (filterPeriod === 'quarter') {
      return calculateMetrics(undefined, selectedQuarter, selectedYear);
    } else if (filterPeriod === 'ytd') {
      return calculateMetrics(undefined, undefined, selectedYear);
    }
    return calculateMetrics();
  }, [filterPeriod, selectedMonth, selectedQuarter, selectedYear, calculateMetrics]);

  const contractorMetrics = useMemo(() => {
    if (filterPeriod === 'month') {
      return getMetricsByContractor(selectedMonth);
    }
    return getMetricsByContractor();
  }, [filterPeriod, selectedMonth, getMetricsByContractor]);

  const customerMetrics = useMemo(() => {
    if (filterPeriod === 'month') {
      return getMetricsByCustomer(selectedMonth);
    }
    return getMetricsByCustomer();
  }, [filterPeriod, selectedMonth, getMetricsByCustomer]);

  const forecast = useMemo(() => projectFutureRevenue(6), [projectFutureRevenue]);

  // Filter timesheets based on period
  const filteredTimesheets = useMemo(() => {
    if (filterPeriod === 'month') {
      return timesheets.filter((t) => t.month === selectedMonth);
    } else if (filterPeriod === 'quarter') {
      const quarterStart = selectedQuarter === 'Q1' ? '01' : selectedQuarter === 'Q2' ? '04' : selectedQuarter === 'Q3' ? '07' : '10';
      const quarterEnd = selectedQuarter === 'Q1' ? '03' : selectedQuarter === 'Q2' ? '06' : selectedQuarter === 'Q3' ? '09' : '12';
      return timesheets.filter((t) => {
        const [year, month] = t.month.split('-');
        return year === selectedYear && month >= quarterStart && month <= quarterEnd;
      });
    } else if (filterPeriod === 'ytd') {
      return timesheets.filter((t) => t.month.startsWith(selectedYear));
    }
    return timesheets;
  }, [timesheets, filterPeriod, selectedMonth, selectedQuarter, selectedYear]);

  const resetForm = () => {
    // Contractor
    setContractorName('');
    setContractorEmail('');
    setContractorPhone('');
    setContractorSkills('');
    setContractorStatus('active');
    // Customer
    setCustomerName('');
    setCustomerContact('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCustomerStatus('active');
    // Assignment
    setAssignContractorId('');
    setAssignCustomerId('');
    setAssignCustomerContactEmail('');
    setAssignInternalRate('');
    setAssignInternalCurrency('USD');
    setAssignExternalRate('');
    setAssignExternalCurrency('USD');
    setAssignStartDate('');
    setAssignEndDate('');
    setAssignStatus('active');
    setAssignNotes('');
    setAssignContractFile(null);
    setAssignContractFileUrl('');
    setAssignContractFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Timesheet
    setTsAssignmentId('');
    setTsMonth(getCurrentMonth());
    setTsStandardDays('20');
    setTsOvertimeDays('0');
    setTsOvertimeHours('0');
    setTsStatus('draft');

    setEditingId(null);
    setShowForm(false);
  };

  // ============ CONTRACTOR HANDLERS ============
  const handleContractorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractorName.trim() || !contractorEmail.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setFormLoading(true);
    const data: ContractorInput = {
      name: contractorName.trim(),
      email: contractorEmail.trim(),
      phone: contractorPhone.trim() || undefined,
      skills: contractorSkills ? contractorSkills.split(',').map((s) => s.trim()) : undefined,
      status: contractorStatus,
    };
    let success = false;
    if (editingId) {
      success = await editContractor(editingId, data);
    } else {
      const id = await addContractor(data);
      success = !!id;
    }
    setFormLoading(false);
    if (success) resetForm();
  };

  const handleEditContractor = (c: any) => {
    setContractorName(c.name);
    setContractorEmail(c.email);
    setContractorPhone(c.phone || '');
    setContractorSkills(c.skills?.join(', ') || '');
    setContractorStatus(c.status);
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDeleteContractor = async (id: string, name: string) => {
    if (window.confirm(`Delete contractor "${name}"? This cannot be undone.`)) {
      await removeContractor(id);
    }
  };

  // ============ CUSTOMER HANDLERS ============
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    setFormLoading(true);
    const data: CustomerInput = {
      name: customerName.trim(),
      contactPerson: customerContact.trim() || undefined,
      email: customerEmail.trim() || undefined,
      phone: customerPhone.trim() || undefined,
      status: customerStatus,
    };
    let success = false;
    if (editingId) {
      success = await editCustomer(editingId, data);
    } else {
      const id = await addCustomer(data);
      success = !!id;
    }
    setFormLoading(false);
    if (success) resetForm();
  };

  const handleEditCustomer = (c: any) => {
    setCustomerName(c.name);
    setCustomerContact(c.contactPerson || '');
    setCustomerEmail(c.email || '');
    setCustomerPhone(c.phone || '');
    setCustomerStatus(c.status);
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (window.confirm(`Delete customer "${name}"? This cannot be undone.`)) {
      await removeCustomer(id);
    }
  };

  // ============ ASSIGNMENT HANDLERS ============
  const handleContractFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateContractFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }

    setAssignContractFile(file);
    setAssignContractFileName(file.name);
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignContractorId || !assignCustomerId || !assignInternalRate || !assignExternalRate || !assignStartDate) {
      toast.error('Please fill all required fields');
      return;
    }
    setFormLoading(true);

    let contractFileUrl = assignContractFileUrl;
    let contractFileName = assignContractFileName;

    // Upload contract file if a new one was selected
    if (assignContractFile && user?.uid) {
      try {
        setUploadingFile(true);
        const result = await uploadContractFile(user.uid, assignContractFile);
        contractFileUrl = result.url;
        contractFileName = result.name;
      } catch (err) {
        toast.error('Failed to upload contract file');
        setFormLoading(false);
        setUploadingFile(false);
        return;
      }
      setUploadingFile(false);
    }

    // Calculate USD equivalent for internal rate
    const internalRateUSD = convertToUSD(parseFloat(assignInternalRate), assignInternalCurrency);
    const exchangeRate = getExchangeRate(assignInternalCurrency);

    const data = {
      contractorId: assignContractorId,
      customerId: assignCustomerId,
      customerContactEmail: assignCustomerContactEmail.trim() || undefined,
      internalDayRate: parseFloat(assignInternalRate),
      internalCurrency: assignInternalCurrency,
      internalDayRateUSD: internalRateUSD,
      externalDayRate: parseFloat(assignExternalRate),
      externalCurrency: assignExternalCurrency,
      exchangeRate,
      standardHoursPerDay: 8,
      standardDaysPerMonth: 20,
      startDate: assignStartDate,
      endDate: assignEndDate || undefined,
      status: assignStatus,
      notes: assignNotes.trim() || undefined,
      contractFileUrl: contractFileUrl || undefined,
      contractFileName: contractFileName || undefined,
    };
    let success = false;
    if (editingId) {
      success = await editAssignment(editingId, data);
    } else {
      const id = await addAssignment(data);
      success = !!id;
    }
    setFormLoading(false);
    if (success) resetForm();
  };

  const handleEditAssignment = (a: ContractorAssignment) => {
    setAssignContractorId(a.contractorId);
    setAssignCustomerId(a.customerId);
    setAssignCustomerContactEmail(a.customerContactEmail || '');
    setAssignInternalRate(a.internalDayRate.toString());
    setAssignInternalCurrency(a.internalCurrency || 'USD');
    setAssignExternalRate(a.externalDayRate.toString());
    setAssignExternalCurrency(a.externalCurrency || 'USD');
    setAssignStartDate(a.startDate);
    setAssignEndDate(a.endDate || '');
    setAssignStatus(a.status);
    setAssignNotes(a.notes || '');
    setAssignContractFileUrl(a.contractFileUrl || '');
    setAssignContractFileName(a.contractFileName || '');
    setAssignContractFile(null);
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleDeleteAssignment = async (id: string) => {
    if (window.confirm('Delete this assignment? This cannot be undone.')) {
      await removeAssignment(id);
    }
  };

  // ============ TIMESHEET HANDLERS ============
  const handleTimesheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tsAssignmentId || !tsMonth) {
      toast.error('Please select an assignment and month');
      return;
    }
    const assignment = assignments.find((a) => a.id === tsAssignmentId);
    if (!assignment) {
      toast.error('Invalid assignment');
      return;
    }
    setFormLoading(true);
    const data = {
      assignmentId: tsAssignmentId,
      contractorId: assignment.contractorId,
      customerId: assignment.customerId,
      month: tsMonth,
      standardDaysWorked: parseFloat(tsStandardDays) || 0,
      overtimeDays: parseFloat(tsOvertimeDays) || 0,
      overtimeHours: parseFloat(tsOvertimeHours) || 0,
      internalDayRate: assignment.internalDayRate,
      externalDayRate: assignment.externalDayRate,
      status: tsStatus,
    };
    let success = false;
    if (editingId) {
      success = await editTimesheet(editingId, data);
    } else {
      const id = await addTimesheet(data);
      success = !!id;
    }
    setFormLoading(false);
    if (success) resetForm();
  };

  const handleEditTimesheet = (t: ContractorTimesheet) => {
    setTsAssignmentId(t.assignmentId);
    setTsMonth(t.month);
    setTsStandardDays(t.standardDaysWorked.toString());
    setTsOvertimeDays(t.overtimeDays.toString());
    setTsOvertimeHours(t.overtimeHours.toString());
    setTsStatus(t.status);
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleDeleteTimesheet = async (id: string) => {
    if (window.confirm('Delete this timesheet entry? This cannot be undone.')) {
      await removeTimesheet(id);
    }
  };

  const handleGenerateTimesheets = async () => {
    await generateTimesheetsForMonth(selectedMonth);
  };

  // Generate month options for the last 12 months
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(now, i);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
      });
    }
    return options;
  }, []);

  const tabs = [
    { id: 'contractors', label: 'Contractors', icon: Users },
    { id: 'customers', label: 'Customers', icon: Building2 },
    { id: 'assignments', label: 'Assignments', icon: Briefcase },
    { id: 'timesheets', label: 'Timesheets', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="text-slate-500">Loading contractor data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Contractor Management</h2>
        <div className="flex items-center gap-3">
          {/* Period Filter */}
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value as FilterPeriod)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="ytd">Year to Date</option>
            <option value="all">All Time</option>
          </select>

          {filterPeriod === 'month' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {filterPeriod === 'quarter' && (
            <>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </>
          )}

          {filterPeriod === 'ytd' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-blue-50 border-blue-200">
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl flex-shrink-0">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-600">Revenue</p>
                <p className="text-2xl font-bold text-blue-700 truncate">{formatCurrency(metrics.totalRevenue)}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-red-100 p-3 rounded-xl flex-shrink-0">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-600">Cost</p>
                <p className="text-2xl font-bold text-red-700 truncate">{formatCurrency(metrics.totalCost)}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-emerald-50 border-emerald-200">
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-100 p-3 rounded-xl flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-600">Profit</p>
                <p className="text-2xl font-bold text-emerald-700 truncate">{formatCurrency(metrics.totalProfit)}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-xl flex-shrink-0">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-600">Margin</p>
                <p className="text-2xl font-bold text-purple-700">{metrics.profitMargin.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4 -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  resetForm();
                }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* ============ CONTRACTORS TAB ============ */}
        {activeTab === 'contractors' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">
                {metrics.activeContractors} active contractor{metrics.activeContractors !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                <Plus size={16} />
                Add Contractor
              </button>
            </div>

            {showForm && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">{editingId ? 'Edit Contractor' : 'New Contractor'}</h3>
                    <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={handleContractorSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Name *</label>
                        <input
                          type="text"
                          value={contractorName}
                          onChange={(e) => setContractorName(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email *</label>
                        <input
                          type="email"
                          value={contractorEmail}
                          onChange={(e) => setContractorEmail(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Phone</label>
                        <input
                          type="tel"
                          value={contractorPhone}
                          onChange={(e) => setContractorPhone(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Status</label>
                        <select
                          value={contractorStatus}
                          onChange={(e) => setContractorStatus(e.target.value as 'active' | 'inactive')}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Skills (comma-separated)</label>
                      <input
                        type="text"
                        value={contractorSkills}
                        onChange={(e) => setContractorSkills(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="React, TypeScript, Node.js"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
                      >
                        {formLoading && <Loader2 className="animate-spin h-4 w-4" />}
                        {editingId ? 'Update' : 'Add'} Contractor
                      </button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {contractors.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-slate-500">No contractors yet</p>
                  <p className="text-sm text-slate-400 mt-1">Add your first contractor to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Skills</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {contractors.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{c.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{c.email}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {c.skills?.slice(0, 3).map((s) => (
                            <span key={s} className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs mr-1">
                              {s}
                            </span>
                          ))}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleEditContractor(c)} className="p-1 text-slate-400 hover:text-indigo-600">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDeleteContractor(c.id, c.name)} className="p-1 text-slate-400 hover:text-red-600 ml-1">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============ CUSTOMERS TAB ============ */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">
                {metrics.activeCustomers} active customer{metrics.activeCustomers !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                <Plus size={16} />
                Add Customer
              </button>
            </div>

            {showForm && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">{editingId ? 'Edit Customer' : 'New Customer'}</h3>
                    <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={handleCustomerSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Company Name *</label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Contact Person</label>
                        <input
                          type="text"
                          value={customerContact}
                          onChange={(e) => setCustomerContact(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Phone</label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <select
                        value={customerStatus}
                        onChange={(e) => setCustomerStatus(e.target.value as 'active' | 'inactive')}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
                      >
                        {formLoading && <Loader2 className="animate-spin h-4 w-4" />}
                        {editingId ? 'Update' : 'Add'} Customer
                      </button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {customers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-slate-500">No customers yet</p>
                  <p className="text-sm text-slate-400 mt-1">Add your first customer to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{c.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{c.contactPerson || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{c.email || '-'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleEditCustomer(c)} className="p-1 text-slate-400 hover:text-indigo-600">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDeleteCustomer(c.id, c.name)} className="p-1 text-slate-400 hover:text-red-600 ml-1">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============ ASSIGNMENTS TAB ============ */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">
                {metrics.activeAssignments} active assignment{metrics.activeAssignments !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => setShowForm(true)}
                disabled={contractors.length === 0 || customers.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
              >
                <Plus size={16} />
                New Assignment
              </button>
            </div>

            {(contractors.length === 0 || customers.length === 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-sm">
                You need at least one contractor and one customer to create an assignment.
              </div>
            )}

            {showForm && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">{editingId ? 'Edit Assignment' : 'New Assignment'}</h3>
                    <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={handleAssignmentSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Contractor *</label>
                        <select
                          value={assignContractorId}
                          onChange={(e) => setAssignContractorId(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        >
                          <option value="">Select contractor...</option>
                          {contractors
                            .filter((c) => c.status === 'active')
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Customer *</label>
                        <select
                          value={assignCustomerId}
                          onChange={(e) => setAssignCustomerId(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        >
                          <option value="">Select customer...</option>
                          {customers
                            .filter((c) => c.status === 'active')
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Customer Contact Email</label>
                      <input
                        type="email"
                        value={assignCustomerContactEmail}
                        onChange={(e) => setAssignCustomerContactEmail(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Contact email provided by customer for this contract"
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Internal Day Rate (Cost) *</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-2.5 text-slate-500">
                              {SUPPORTED_CURRENCIES[assignInternalCurrency]?.symbol || '$'}
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={assignInternalRate}
                              onChange={(e) => setAssignInternalRate(e.target.value)}
                              className="flex h-10 w-full rounded-md border border-slate-300 bg-white pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            />
                          </div>
                          <select
                            value={assignInternalCurrency}
                            onChange={(e) => setAssignInternalCurrency(e.target.value as CurrencyCode)}
                            className="h-10 w-24 rounded-md border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.code}
                              </option>
                            ))}
                          </select>
                        </div>
                        {assignInternalCurrency !== 'USD' && assignInternalRate && (
                          <p className="text-xs text-slate-500">
                            ≈ ${convertToUSD(parseFloat(assignInternalRate), assignInternalCurrency).toFixed(2)} USD
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">External Day Rate (Bill to Customer) *</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={assignExternalRate}
                              onChange={(e) => setAssignExternalRate(e.target.value)}
                              className="flex h-10 w-full rounded-md border border-slate-300 bg-white pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            />
                          </div>
                          <div className="h-10 w-24 flex items-center justify-center bg-slate-100 rounded-md border border-slate-300 text-sm font-medium text-slate-600">
                            USD
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">Customer billing is always in USD</p>
                      </div>
                    </div>
                    {marginPreview && (
                      <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-1">
                        <div>
                          <span className="text-slate-600">Margin per day (USD): </span>
                          <span className="font-semibold text-emerald-600">
                            ${marginPreview.margin.toFixed(2)} ({marginPreview.marginPercent.toFixed(1)}%)
                          </span>
                        </div>
                        {assignInternalCurrency !== 'USD' && (
                          <div className="text-xs text-slate-500">
                            Internal rate converted: {SUPPORTED_CURRENCIES[assignInternalCurrency]?.symbol}{assignInternalRate} {assignInternalCurrency} → ${marginPreview.internalRateUSD.toFixed(2)} USD
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Start Date *</label>
                        <input
                          type="date"
                          value={assignStartDate}
                          onChange={(e) => setAssignStartDate(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">End Date</label>
                        <input
                          type="date"
                          value={assignEndDate}
                          onChange={(e) => setAssignEndDate(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Status</label>
                        <select
                          value={assignStatus}
                          onChange={(e) => setAssignStatus(e.target.value as 'active' | 'completed' | 'cancelled')}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notes</label>
                      <input
                        type="text"
                        value={assignNotes}
                        onChange={(e) => setAssignNotes(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Contract File</label>
                      <div className="flex items-center gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                          onChange={handleContractFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingFile}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium disabled:opacity-50"
                        >
                          {uploadingFile ? (
                            <Loader2 className="animate-spin h-4 w-4" />
                          ) : (
                            <Upload size={16} />
                          )}
                          {assignContractFile ? 'Change File' : 'Upload Contract'}
                        </button>
                        {(assignContractFile || assignContractFileName) && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <FileText size={16} className="text-indigo-500" />
                            <span className="truncate max-w-[200px]">
                              {assignContractFile?.name || assignContractFileName}
                            </span>
                            {assignContractFileUrl && !assignContractFile && (
                              <a
                                href={assignContractFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-800"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Supported: PDF, Word documents, Images (max 10MB)
                      </p>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
                      >
                        {formLoading && <Loader2 className="animate-spin h-4 w-4" />}
                        {editingId ? 'Update' : 'Create'} Assignment
                      </button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {assignments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-slate-500">No assignments yet</p>
                  <p className="text-sm text-slate-400 mt-1">Create an assignment to link a contractor with a customer</p>
                </CardContent>
              </Card>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contractor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Rates</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Period</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Contract</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {assignments.map((a) => {
                      // Calculate margin in USD
                      const internalCurrency = a.internalCurrency || 'USD';
                      const internalRateUSD = a.internalDayRateUSD ?? convertToUSD(a.internalDayRate, internalCurrency);
                      const marginUSD = a.externalDayRate - internalRateUSD;
                      const marginPct = a.externalDayRate > 0 ? (marginUSD / a.externalDayRate) * 100 : 0;
                      const daysLeft = a.endDate
                        ? Math.ceil((new Date(a.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : null;
                      const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;
                      const currencyInfo = SUPPORTED_CURRENCIES[internalCurrency];
                      return (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{a.contractorName}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{a.customerName}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex flex-col gap-0.5">
                              <div className="text-slate-600">
                                <span className="text-xs text-slate-400">Cost: </span>
                                {currencyInfo?.symbol}{a.internalDayRate.toLocaleString()}{' '}
                                <span className="text-xs text-slate-400">{internalCurrency}</span>
                                {internalCurrency !== 'USD' && (
                                  <span className="text-xs text-slate-400"> (≈${internalRateUSD.toFixed(0)})</span>
                                )}
                              </div>
                              <div className="text-slate-600">
                                <span className="text-xs text-slate-400">Bill: </span>
                                ${a.externalDayRate.toLocaleString()}{' '}
                                <span className="text-xs text-slate-400">USD</span>
                              </div>
                              <div className="text-emerald-600 font-medium text-xs">
                                Margin: ${marginUSD.toFixed(0)}/day ({marginPct.toFixed(0)}%)
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            <div className="flex flex-col">
                              <span>{format(new Date(a.startDate), 'MMM d, yyyy')}</span>
                              {a.endDate && (
                                <span className={isExpiringSoon ? 'text-amber-600 font-medium' : ''}>
                                  to {format(new Date(a.endDate), 'MMM d, yyyy')}
                                  {isExpiringSoon && ` (${daysLeft}d left)`}
                                </span>
                              )}
                              {!a.endDate && <span className="text-slate-400">Ongoing</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {a.contractFileUrl ? (
                              <a
                                href={a.contractFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                                title={a.contractFileName || 'View contract'}
                              >
                                <FileText size={16} />
                                <ExternalLink size={12} />
                              </a>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                a.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : a.status === 'completed'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {a.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleEditAssignment(a)} className="p-1 text-slate-400 hover:text-indigo-600">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => handleDeleteAssignment(a.id)} className="p-1 text-slate-400 hover:text-red-600 ml-1">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============ TIMESHEETS TAB ============ */}
        {activeTab === 'timesheets' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">
                {filteredTimesheets.length} timesheet entr{filteredTimesheets.length !== 1 ? 'ies' : 'y'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateTimesheets}
                  disabled={assignments.filter((a) => a.status === 'active').length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium disabled:opacity-50"
                >
                  <FileSpreadsheet size={16} />
                  Generate for {format(new Date(selectedMonth + '-01'), 'MMM yyyy')}
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  disabled={assignments.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
                >
                  <Plus size={16} />
                  Add Entry
                </button>
              </div>
            </div>

            {showForm && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">{editingId ? 'Edit Timesheet' : 'New Timesheet Entry'}</h3>
                    <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={handleTimesheetSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Assignment *</label>
                        <select
                          value={tsAssignmentId}
                          onChange={(e) => setTsAssignmentId(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        >
                          <option value="">Select assignment...</option>
                          {assignments
                            .filter((a) => a.status === 'active')
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.contractorName} → {a.customerName}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Month *</label>
                        <input
                          type="month"
                          value={tsMonth}
                          onChange={(e) => setTsMonth(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Standard Days Worked</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="31"
                          value={tsStandardDays}
                          onChange={(e) => setTsStandardDays(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Overtime Days</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={tsOvertimeDays}
                          onChange={(e) => setTsOvertimeDays(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Overtime Hours</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={tsOvertimeHours}
                          onChange={(e) => setTsOvertimeHours(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <select
                        value={tsStatus}
                        onChange={(e) => setTsStatus(e.target.value as 'draft' | 'submitted' | 'approved')}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="draft">Draft</option>
                        <option value="submitted">Submitted</option>
                        <option value="approved">Approved</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
                      >
                        {formLoading && <Loader2 className="animate-spin h-4 w-4" />}
                        {editingId ? 'Update' : 'Add'} Entry
                      </button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {filteredTimesheets.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-slate-500">No timesheet entries for this period</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Add entries manually or generate from active assignments
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Month</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contractor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Days</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Revenue</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Cost</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Profit</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredTimesheets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-600">{format(new Date(t.month + '-01'), 'MMM yyyy')}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{t.contractorName}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{t.customerName}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">{t.totalDaysWorked.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatCurrency(t.externalRevenue)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatCurrency(t.internalCost)}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={t.profit >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                            {formatCurrency(t.profit)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              t.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : t.status === 'submitted'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleEditTimesheet(t)} className="p-1 text-slate-400 hover:text-indigo-600">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDeleteTimesheet(t.id)} className="p-1 text-slate-400 hover:text-red-600 ml-1">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============ ANALYTICS TAB ============ */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* P&L by Contractor */}
              <Card>
                <CardHeader>
                  <CardTitle>P&L by Contractor</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {contractorMetrics.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-500">
                      No data for selected period
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={contractorMetrics}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="contractorName" tick={{ fontSize: 12 }} />
                          <YAxis tickFormatter={(v) => `$${v / 1000}K`} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                          <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                          <Bar dataKey="cost" name="Cost" fill="#ef4444" />
                          <Bar dataKey="profit" name="Profit" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* P&L by Customer */}
              <Card>
                <CardHeader>
                  <CardTitle>P&L by Customer</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {customerMetrics.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-500">
                      No data for selected period
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={customerMetrics}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="customerName" tick={{ fontSize: 12 }} />
                          <YAxis tickFormatter={(v) => `$${v / 1000}K`} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                          <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                          <Bar dataKey="cost" name="Cost" fill="#ef4444" />
                          <Bar dataKey="profit" name="Profit" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Forecast Chart */}
            <Card>
              <CardHeader>
                <CardTitle>6-Month Revenue Forecast</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {forecast.length === 0 || assignments.filter((a) => a.status === 'active').length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-500">
                    No active assignments to project
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={forecast}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="month"
                          tickFormatter={(v) => format(new Date(v + '-01'), 'MMM')}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis tickFormatter={(v) => `$${v / 1000}K`} tick={{ fontSize: 12 }} />
                        <Tooltip
                          labelFormatter={(v) => format(new Date(v + '-01'), 'MMMM yyyy')}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="projectedRevenue"
                          name="Revenue"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="projectedCost"
                          name="Cost"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="projectedProfit"
                          name="Profit"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detailed Tables */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Contractor Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Contractor Performance</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {contractorMetrics.length === 0 ? (
                    <p className="text-slate-500 text-sm">No data for selected period</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Contractor</th>
                            <th className="text-right py-2">Days</th>
                            <th className="text-right py-2">Revenue</th>
                            <th className="text-right py-2">Margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contractorMetrics.map((m) => (
                            <tr key={m.contractorId} className="border-b border-slate-100">
                              <td className="py-2 font-medium">{m.contractorName}</td>
                              <td className="py-2 text-right">{m.daysWorked.toFixed(1)}</td>
                              <td className="py-2 text-right">{formatCurrency(m.revenue)}</td>
                              <td className="py-2 text-right text-emerald-600">{m.margin.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Customer Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Revenue</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {customerMetrics.length === 0 ? (
                    <p className="text-slate-500 text-sm">No data for selected period</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Customer</th>
                            <th className="text-right py-2">Contractors</th>
                            <th className="text-right py-2">Revenue</th>
                            <th className="text-right py-2">Profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerMetrics.map((m) => (
                            <tr key={m.customerId} className="border-b border-slate-100">
                              <td className="py-2 font-medium">{m.customerName}</td>
                              <td className="py-2 text-right">{m.contractorCount}</td>
                              <td className="py-2 text-right">{formatCurrency(m.revenue)}</td>
                              <td className="py-2 text-right text-emerald-600">{formatCurrency(m.profit)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contractors;
