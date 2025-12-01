import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  Users,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  X,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { useTeamMembers } from '../hooks/useTeamMembers';
import type { TeamMemberInput, PayrollRecordInput, CurrencyCode } from '../types';
import { SUPPORTED_CURRENCIES } from '../types';
import { format, startOfMonth } from 'date-fns';
import toast from 'react-hot-toast';

const DEPARTMENTS = [
  'Engineering',
  'Design',
  'Product',
  'Marketing',
  'Sales',
  'Operations',
  'Finance',
  'HR',
  'Other',
];

type TabType = 'members' | 'payroll';

const Team: React.FC = () => {
  const {
    teamMembers,
    payrollRecords,
    loading,
    metrics,
    addTeamMember,
    editTeamMember,
    removeTeamMember,
    editPayrollRecord,
    removePayrollRecord,
    generateMonthlyPayroll,
    markPayrollPaid,
  } = useTeamMembers({ realtime: true });

  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  // Member form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [startDate, setStartDate] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [notes, setNotes] = useState('');

  // Payroll state
  const [selectedMonth, setSelectedMonth] = useState(format(startOfMonth(new Date()), 'yyyy-MM'));
  const [selectedPayrollIds, setSelectedPayrollIds] = useState<string[]>([]);

  const resetMemberForm = () => {
    setName('');
    setEmail('');
    setRole('');
    setDepartment('');
    setMonthlySalary('');
    setCurrency('USD');
    setStartDate('');
    setStatus('active');
    setNotes('');
    setEditingMemberId(null);
  };

  const handleEditMember = (member: typeof teamMembers[0]) => {
    setName(member.name);
    setEmail(member.email);
    setRole(member.role);
    setDepartment(member.department || '');
    setMonthlySalary(member.monthlySalary.toString());
    setCurrency(member.currency);
    setStartDate(member.startDate);
    setStatus(member.status);
    setNotes(member.notes || '');
    setEditingMemberId(member.id);
    setShowMemberForm(true);
  };

  const handleSubmitMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !role || !monthlySalary || !startDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const data: TeamMemberInput = {
      name,
      email,
      role,
      department: department || undefined,
      monthlySalary: parseFloat(monthlySalary),
      currency,
      startDate,
      status,
      notes: notes || undefined,
    };

    let success: boolean | string | null;
    if (editingMemberId) {
      success = await editTeamMember(editingMemberId, data);
    } else {
      success = await addTeamMember(data);
    }

    if (success) {
      resetMemberForm();
      setShowMemberForm(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (confirm('Are you sure you want to remove this team member?')) {
      await removeTeamMember(id);
    }
  };

  const handleGeneratePayroll = async () => {
    if (confirm(`Generate payroll for ${selectedMonth}?`)) {
      await generateMonthlyPayroll(selectedMonth);
    }
  };

  const handleMarkPaid = async () => {
    if (selectedPayrollIds.length === 0) {
      toast.error('Select payroll records to mark as paid');
      return;
    }
    await markPayrollPaid(selectedPayrollIds);
    setSelectedPayrollIds([]);
  };

  const togglePayrollSelection = (id: string) => {
    setSelectedPayrollIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllPending = () => {
    const pendingIds = filteredPayroll
      .filter((r) => r.status === 'pending')
      .map((r) => r.id);
    setSelectedPayrollIds(pendingIds);
  };

  // Filter payroll by selected month
  const filteredPayroll = useMemo(() => {
    return payrollRecords.filter((r) => r.month === selectedMonth);
  }, [payrollRecords, selectedMonth]);

  const formatCurrency = (value: number, curr: CurrencyCode = 'USD') => {
    const info = SUPPORTED_CURRENCIES[curr];
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Team & Payroll</h2>
        {activeTab === 'members' && (
          <button
            onClick={() => {
              resetMemberForm();
              setShowMemberForm(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            <UserPlus size={16} />
            Add Team Member
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active Members</p>
                <p className="text-2xl font-bold text-indigo-700">{metrics.activeMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Monthly Payroll</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(metrics.monthlyPayroll)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Pending Payroll</p>
                <p className="text-2xl font-bold text-amber-700">{formatCurrency(metrics.pendingPayroll)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Annual Payroll</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(metrics.annualPayroll)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Team Members
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'payroll'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Payroll Records
          </button>
        </nav>
      </div>

      {/* Add/Edit Member Form */}
      {showMemberForm && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">
                {editingMemberId ? 'Edit Team Member' : 'Add Team Member'}
              </h3>
              <button
                onClick={() => {
                  resetMemberForm();
                  setShowMemberForm(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmitMember} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="john@company.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Role *
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Software Engineer"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Monthly Salary *
                  </label>
                  <input
                    type="number"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="5000"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {Object.values(SUPPORTED_CURRENCIES).map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code} - {curr.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Any additional notes..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetMemberForm();
                    setShowMemberForm(false);
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                  {editingMemberId ? 'Update' : 'Add'} Member
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Team Members Tab */}
      {activeTab === 'members' && (
        <>
          {teamMembers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No team members yet</h3>
                <p className="text-slate-500 mb-4">Add your first team member to start tracking payroll</p>
                <button
                  onClick={() => setShowMemberForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                  <Plus size={16} />
                  Add Team Member
                </button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teamMembers.map((member) => (
                <Card key={member.id} className={member.status === 'inactive' ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-900">{member.name}</h4>
                        <p className="text-sm text-slate-500">{member.role}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditMember(member)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Email</span>
                        <span className="text-slate-700">{member.email}</span>
                      </div>
                      {member.department && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Department</span>
                          <span className="text-slate-700">{member.department}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">Monthly Salary</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(member.monthlySalary, member.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Start Date</span>
                        <span className="text-slate-700">{format(new Date(member.startDate), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Status</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            member.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {member.status}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Payroll Tab */}
      {activeTab === 'payroll' && (
        <>
          {/* Payroll Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-slate-700">Month:</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleGeneratePayroll}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                  >
                    <Calendar size={16} />
                    Generate Payroll
                  </button>
                  {filteredPayroll.some((r) => r.status === 'pending') && (
                    <>
                      <button
                        onClick={selectAllPending}
                        className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium"
                      >
                        Select All Pending
                      </button>
                      <button
                        onClick={handleMarkPaid}
                        disabled={selectedPayrollIds.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle size={16} />
                        Mark Paid ({selectedPayrollIds.length})
                      </button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {filteredPayroll.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No payroll records</h3>
                <p className="text-slate-500 mb-4">
                  No payroll records for {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
                </p>
                {teamMembers.filter((m) => m.status === 'active').length > 0 && (
                  <button
                    onClick={handleGeneratePayroll}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                  >
                    <Plus size={16} />
                    Generate Payroll
                  </button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="w-12 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={
                              selectedPayrollIds.length > 0 &&
                              selectedPayrollIds.length ===
                                filteredPayroll.filter((r) => r.status === 'pending').length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                selectAllPending();
                              } else {
                                setSelectedPayrollIds([]);
                              }
                            }}
                            className="rounded border-slate-300"
                          />
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Team Member
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Base Salary
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Bonus
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Deductions
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Net Amount
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPayroll.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            {record.status === 'pending' && (
                              <input
                                type="checkbox"
                                checked={selectedPayrollIds.includes(record.id)}
                                onChange={() => togglePayrollSelection(record.id)}
                                className="rounded border-slate-300"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-900">{record.teamMemberName}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {formatCurrency(record.baseSalary, record.currency)}
                          </td>
                          <td className="px-4 py-3 text-right text-green-600">
                            {record.bonus ? `+${formatCurrency(record.bonus, record.currency)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-red-600">
                            {record.deductions ? `-${formatCurrency(record.deductions, record.currency)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {formatCurrency(record.netAmount, record.currency)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                record.status === 'paid'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {record.status === 'paid' ? (
                                <CheckCircle size={12} />
                              ) : (
                                <Clock size={12} />
                              )}
                              {record.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => removePayrollRecord(record.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-right font-semibold text-slate-700">
                          Total:
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {formatCurrency(filteredPayroll.reduce((sum, r) => sum + r.netAmount, 0))}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Team;
