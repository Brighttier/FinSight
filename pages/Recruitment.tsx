import React, { useState, useMemo } from 'react';
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
  Clock,
  Search,
  Filter,
  Download,
  ChevronDown,
  UserPlus,
  ClipboardList,
  AlertCircle,
  Phone,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { useRecruitment, STATUS_LABELS, STATUS_COLORS, TASK_TYPE_LABELS } from '../hooks/useRecruitment';
import { format, parseISO } from 'date-fns';
import type {
  RecruitmentClientInput,
  JobRoleInput,
  RecruiterInput,
  CandidateInput,
  CandidateSubmissionInput,
  RecruiterTaskInput,
  CandidateStatus,
  RecruiterTaskType,
} from '../types';
import toast from 'react-hot-toast';

type ActiveTab = 'pipeline' | 'tasks' | 'setup';

const Recruitment: React.FC = () => {
  const {
    clients,
    jobRoles,
    recruiters,
    candidates,
    submissions,
    tasks,
    loading,
    addClient,
    editClient,
    removeClient,
    addJobRole,
    editJobRole,
    removeJobRole,
    addRecruiter,
    editRecruiter,
    removeRecruiter,
    addCandidate,
    editCandidate,
    removeCandidate,
    addSubmission,
    editSubmission,
    removeSubmission,
    addTask,
    editTask,
    removeTask,
    kpis,
  } = useRecruitment({ realtime: true });

  const [activeTab, setActiveTab] = useState<ActiveTab>('pipeline');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'submission' | 'task' | 'client' | 'role' | 'recruiter' | 'candidate'>('submission');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters
  const [filterClient, setFilterClient] = useState('');
  const [filterRecruiter, setFilterRecruiter] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Form states - Submission
  const [subCandidateId, setSubCandidateId] = useState('');
  const [subClientId, setSubClientId] = useState('');
  const [subJobRoleId, setSubJobRoleId] = useState('');
  const [subRecruiterId, setSubRecruiterId] = useState('');
  const [subStatus, setSubStatus] = useState<CandidateStatus>('submitted_to_client');
  const [subNextActionDate, setSubNextActionDate] = useState('');
  const [subNextActionDesc, setSubNextActionDesc] = useState('');
  const [subNotes, setSubNotes] = useState('');

  // Form states - Task
  const [taskRecruiterId, setTaskRecruiterId] = useState('');
  const [taskType, setTaskType] = useState<RecruiterTaskType>('follow_up');
  const [taskDate, setTaskDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [taskTime, setTaskTime] = useState(format(new Date(), 'HH:mm'));
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDetails, setTaskDetails] = useState('');
  const [taskClientId, setTaskClientId] = useState('');
  const [taskCandidateId, setTaskCandidateId] = useState('');
  const [taskStatus, setTaskStatus] = useState<'completed' | 'pending'>('completed');

  // Form states - Client
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientIndustry, setClientIndustry] = useState('');

  // Form states - Recruiter
  const [recruiterName, setRecruiterName] = useState('');
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [recruiterPhone, setRecruiterPhone] = useState('');

  // Form states - Candidate
  const [candName, setCandName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candCompany, setCandCompany] = useState('');
  const [candRole, setCandRole] = useState('');
  const [candSource, setCandSource] = useState('');

  // Form states - Job Role
  const [roleTitle, setRoleTitle] = useState('');
  const [roleClientId, setRoleClientId] = useState('');
  const [roleType, setRoleType] = useState<'full_time' | 'part_time' | 'contract'>('full_time');
  const [rolePriority, setRolePriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Filtered data
  const filteredSubmissions = useMemo(() => {
    let result = [...submissions];

    if (filterClient) {
      result = result.filter((s) => s.clientId === filterClient);
    }
    if (filterRecruiter) {
      result = result.filter((s) => s.recruiterId === filterRecruiter);
    }
    if (filterStatus) {
      result = result.filter((s) => s.status === filterStatus);
    }
    if (filterRole) {
      result = result.filter((s) => s.jobRoleId === filterRole);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.candidateName.toLowerCase().includes(q) ||
          s.clientName.toLowerCase().includes(q) ||
          s.jobRoleTitle.toLowerCase().includes(q)
      );
    }
    if (filterDateFrom) {
      result = result.filter((s) => s.dateSubmitted >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter((s) => s.dateSubmitted <= filterDateTo);
    }

    return result;
  }, [submissions, filterClient, filterRecruiter, filterStatus, filterRole, searchQuery, filterDateFrom, filterDateTo]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (filterRecruiter) {
      result = result.filter((t) => t.recruiterId === filterRecruiter);
    }
    if (filterDateFrom) {
      result = result.filter((t) => t.date >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter((t) => t.date <= filterDateTo);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.recruiterName.toLowerCase().includes(q) ||
          (t.clientName && t.clientName.toLowerCase().includes(q)) ||
          (t.candidateName && t.candidateName.toLowerCase().includes(q))
      );
    }

    return result;
  }, [tasks, filterRecruiter, filterDateFrom, filterDateTo, searchQuery]);

  // Reset form
  const resetForm = () => {
    setSubCandidateId('');
    setSubClientId('');
    setSubJobRoleId('');
    setSubRecruiterId('');
    setSubStatus('submitted_to_client');
    setSubNextActionDate('');
    setSubNextActionDesc('');
    setSubNotes('');
    setTaskRecruiterId('');
    setTaskType('follow_up');
    setTaskDate(format(new Date(), 'yyyy-MM-dd'));
    setTaskTime(format(new Date(), 'HH:mm'));
    setTaskDescription('');
    setTaskDetails('');
    setTaskClientId('');
    setTaskCandidateId('');
    setTaskStatus('completed');
    setClientName('');
    setClientContact('');
    setClientEmail('');
    setClientPhone('');
    setClientIndustry('');
    setRecruiterName('');
    setRecruiterEmail('');
    setRecruiterPhone('');
    setCandName('');
    setCandEmail('');
    setCandPhone('');
    setCandCompany('');
    setCandRole('');
    setCandSource('');
    setRoleTitle('');
    setRoleClientId('');
    setRoleType('full_time');
    setRolePriority('medium');
    setEditingId(null);
    setShowForm(false);
  };

  // Handle form submissions
  const handleSubmitCandidate = async () => {
    if (!subCandidateId || !subClientId || !subJobRoleId || !subRecruiterId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const candidate = candidates.find((c) => c.id === subCandidateId);
    const client = clients.find((c) => c.id === subClientId);
    const role = jobRoles.find((r) => r.id === subJobRoleId);
    const recruiter = recruiters.find((r) => r.id === subRecruiterId);

    if (!candidate || !client || !role || !recruiter) {
      toast.error('Invalid selection');
      return;
    }

    const data: CandidateSubmissionInput = {
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      clientId: client.id,
      clientName: client.name,
      jobRoleId: role.id,
      jobRoleTitle: role.title,
      recruiterId: recruiter.id,
      recruiterName: recruiter.name,
      status: subStatus,
      dateSubmitted: format(new Date(), 'yyyy-MM-dd'),
      nextActionDate: subNextActionDate || undefined,
      nextActionDescription: subNextActionDesc || undefined,
      notes: subNotes || undefined,
    };

    if (editingId) {
      await editSubmission(editingId, data);
    } else {
      await addSubmission(data);
    }
    resetForm();
  };

  const handleSubmitTask = async () => {
    if (!taskRecruiterId || !taskDescription) {
      toast.error('Please fill in all required fields');
      return;
    }

    const recruiter = recruiters.find((r) => r.id === taskRecruiterId);
    if (!recruiter) {
      toast.error('Invalid recruiter');
      return;
    }

    const client = taskClientId ? clients.find((c) => c.id === taskClientId) : null;
    const candidate = taskCandidateId ? candidates.find((c) => c.id === taskCandidateId) : null;

    const data: RecruiterTaskInput = {
      recruiterId: recruiter.id,
      recruiterName: recruiter.name,
      taskType: taskType,
      date: taskDate,
      time: taskTime,
      description: taskDescription,
      details: taskDetails || undefined,
      clientId: client?.id,
      clientName: client?.name,
      candidateId: candidate?.id,
      candidateName: candidate?.name,
      status: taskStatus,
    };

    if (editingId) {
      await editTask(editingId, data);
    } else {
      await addTask(data);
    }
    resetForm();
  };

  const handleSubmitClient = async () => {
    if (!clientName) {
      toast.error('Client name is required');
      return;
    }

    const data: RecruitmentClientInput = {
      name: clientName,
      contactPerson: clientContact || undefined,
      email: clientEmail || undefined,
      phone: clientPhone || undefined,
      industry: clientIndustry || undefined,
      status: 'active',
    };

    if (editingId) {
      await editClient(editingId, data);
    } else {
      await addClient(data);
    }
    resetForm();
  };

  const handleSubmitRecruiter = async () => {
    if (!recruiterName || !recruiterEmail) {
      toast.error('Name and email are required');
      return;
    }

    const data: RecruiterInput = {
      name: recruiterName,
      email: recruiterEmail,
      phone: recruiterPhone || undefined,
      status: 'active',
    };

    if (editingId) {
      await editRecruiter(editingId, data);
    } else {
      await addRecruiter(data);
    }
    resetForm();
  };

  const handleSubmitCandidateForm = async () => {
    if (!candName || !candEmail) {
      toast.error('Name and email are required');
      return;
    }

    const data: CandidateInput = {
      name: candName,
      email: candEmail,
      phone: candPhone || undefined,
      currentCompany: candCompany || undefined,
      currentRole: candRole || undefined,
      source: candSource || undefined,
    };

    if (editingId) {
      await editCandidate(editingId, data);
    } else {
      await addCandidate(data);
    }
    resetForm();
  };

  const handleSubmitRole = async () => {
    if (!roleTitle || !roleClientId) {
      toast.error('Title and client are required');
      return;
    }

    const client = clients.find((c) => c.id === roleClientId);
    if (!client) {
      toast.error('Invalid client');
      return;
    }

    const data: JobRoleInput = {
      title: roleTitle,
      clientId: client.id,
      clientName: client.name,
      type: roleType,
      priority: rolePriority,
      status: 'open',
      openDate: format(new Date(), 'yyyy-MM-dd'),
    };

    if (editingId) {
      await editJobRole(editingId, data);
    } else {
      await addJobRole(data);
    }
    resetForm();
  };

  const openFormFor = (type: typeof formType) => {
    resetForm();
    setFormType(type);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recruitment Pipeline</h1>
          <p className="text-slate-500">Track candidates, submissions, and recruiter activities</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openFormFor('submission')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            <UserPlus size={16} />
            Submit Candidate
          </button>
          <button
            onClick={() => openFormFor('task')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
          >
            <ClipboardList size={16} />
            Log Task
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
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
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-emerald-600 font-medium">Placements (Quarter)</p>
                <p className="text-2xl font-bold text-emerald-700">{kpis.placementsThisQuarter}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          {[
            { id: 'pipeline', label: 'Client Pipeline', icon: Users },
            { id: 'tasks', label: 'Recruiter Task Log', icon: ClipboardList },
            { id: 'setup', label: 'Setup', icon: Building2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={filterRecruiter}
              onChange={(e) => setFilterRecruiter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Recruiters</option>
              {recruiters.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            {activeTab === 'pipeline' && (
              <>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Roles</option>
                  {jobRoles.map((r) => (
                    <option key={r.id} value={r.id}>{r.title} - {r.clientName}</option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </>
            )}

            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />

            {(filterClient || filterRecruiter || filterStatus || filterRole || filterDateFrom || filterDateTo || searchQuery) && (
              <button
                onClick={() => {
                  setFilterClient('');
                  setFilterRecruiter('');
                  setFilterStatus('');
                  setFilterRole('');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setSearchQuery('');
                }}
                className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                Clear Filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Client Pipeline Tab */}
      {activeTab === 'pipeline' && (
        <Card>
          <CardHeader>
            <CardTitle>
              Client Pipeline ({filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredSubmissions.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No submissions found</p>
                <button
                  onClick={() => openFormFor('submission')}
                  className="mt-4 text-indigo-600 hover:underline"
                >
                  Submit your first candidate
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Candidate</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Client / Role</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Submitted</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Next Action</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Recruiter</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Last Update</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.map((sub) => {
                      const statusStyle = STATUS_COLORS[sub.status];
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{sub.candidateName}</div>
                            <div className="text-xs text-slate-500">{sub.candidateEmail}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{sub.clientName}</div>
                            <div className="text-xs text-slate-500">{sub.jobRoleTitle}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                              {STATUS_LABELS[sub.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {format(parseISO(sub.dateSubmitted), 'MMM d, yyyy')}
                          </td>
                          <td className="px-4 py-3">
                            {sub.nextActionDate ? (
                              <div>
                                <div className="text-slate-900">{sub.nextActionDescription || 'Follow up'}</div>
                                <div className="text-xs text-slate-500">
                                  {format(parseISO(sub.nextActionDate), 'MMM d')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{sub.recruiterName}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {sub.lastClientUpdate ? (
                              <>
                                {format(parseISO(sub.lastClientUpdate), 'MMM d')}
                                {sub.lastClientResponse && (
                                  <div className="text-slate-400 truncate max-w-[150px]">
                                    {sub.lastClientResponse}
                                  </div>
                                )}
                              </>
                            ) : (
                              'No response yet'
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingId(sub.id);
                                  setFormType('submission');
                                  setSubCandidateId(sub.candidateId);
                                  setSubClientId(sub.clientId);
                                  setSubJobRoleId(sub.jobRoleId);
                                  setSubRecruiterId(sub.recruiterId);
                                  setSubStatus(sub.status);
                                  setSubNextActionDate(sub.nextActionDate || '');
                                  setSubNextActionDesc(sub.nextActionDescription || '');
                                  setSubNotes(sub.notes || '');
                                  setShowForm(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this submission?')) {
                                    removeSubmission(sub.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Task Log Tab */}
      {activeTab === 'tasks' && (
        <Card>
          <CardHeader>
            <CardTitle>
              Recruiter Task Log ({filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No tasks logged</p>
                <button
                  onClick={() => openFormFor('task')}
                  className="mt-4 text-indigo-600 hover:underline"
                >
                  Log your first task
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Time</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Recruiter</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Task Type</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Description</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Associated With</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-900">
                          {format(parseISO(task.date), 'MMM d, yyyy')}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{task.time}</td>
                        <td className="px-4 py-3 text-slate-900">{task.recruiterName}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {TASK_TYPE_LABELS[task.taskType] || task.taskType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-900 max-w-[300px] truncate">{task.description}</div>
                          {task.details && (
                            <div className="text-xs text-slate-500 max-w-[300px] truncate">{task.details}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {task.clientName && task.candidateName ? (
                            <span>{task.clientName} / {task.candidateName}</span>
                          ) : task.clientName ? (
                            <span>{task.clientName}</span>
                          ) : task.candidateName ? (
                            <span>{task.candidateName}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            task.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {task.status === 'completed' ? 'Completed' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingId(task.id);
                                setFormType('task');
                                setTaskRecruiterId(task.recruiterId);
                                setTaskType(task.taskType);
                                setTaskDate(task.date);
                                setTaskTime(task.time);
                                setTaskDescription(task.description);
                                setTaskDetails(task.details || '');
                                setTaskClientId(task.clientId || '');
                                setTaskCandidateId(task.candidateId || '');
                                setTaskStatus(task.status === 'cancelled' ? 'pending' : task.status);
                                setShowForm(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this task?')) {
                                  removeTask(task.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setup Tab */}
      {activeTab === 'setup' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Clients */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Clients ({clients.length})</CardTitle>
              <button
                onClick={() => openFormFor('client')}
                className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Plus size={14} />
                Add
              </button>
            </CardHeader>
            <CardContent className="p-0">
              {clients.length === 0 ? (
                <p className="p-4 text-center text-slate-500 text-sm">No clients yet</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {clients.map((c) => (
                    <div key={c.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <div className="font-medium text-slate-900">{c.name}</div>
                        {c.industry && <div className="text-xs text-slate-500">{c.industry}</div>}
                      </div>
                      <button
                        onClick={() => removeClient(c.id)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job Roles */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Job Roles ({jobRoles.filter((r) => r.status === 'open').length} open)</CardTitle>
              <button
                onClick={() => openFormFor('role')}
                className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Plus size={14} />
                Add
              </button>
            </CardHeader>
            <CardContent className="p-0">
              {jobRoles.length === 0 ? (
                <p className="p-4 text-center text-slate-500 text-sm">No roles yet</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {jobRoles.map((r) => (
                    <div key={r.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <div className="font-medium text-slate-900">{r.title}</div>
                        <div className="text-xs text-slate-500">{r.clientName}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          r.status === 'open' ? 'bg-green-100 text-green-700' :
                          r.status === 'filled' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {r.status}
                        </span>
                        <button
                          onClick={() => removeJobRole(r.id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recruiters */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recruiters ({recruiters.length})</CardTitle>
              <button
                onClick={() => openFormFor('recruiter')}
                className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Plus size={14} />
                Add
              </button>
            </CardHeader>
            <CardContent className="p-0">
              {recruiters.length === 0 ? (
                <p className="p-4 text-center text-slate-500 text-sm">No recruiters yet</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {recruiters.map((r) => (
                    <div key={r.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <div className="font-medium text-slate-900">{r.name}</div>
                        <div className="text-xs text-slate-500">{r.email}</div>
                      </div>
                      <button
                        onClick={() => removeRecruiter(r.id)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Candidates */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Candidates ({candidates.length})</CardTitle>
              <button
                onClick={() => openFormFor('candidate')}
                className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Plus size={14} />
                Add
              </button>
            </CardHeader>
            <CardContent className="p-0">
              {candidates.length === 0 ? (
                <p className="p-4 text-center text-slate-500 text-sm">No candidates yet</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {candidates.map((c) => (
                    <div key={c.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <div className="font-medium text-slate-900">{c.name}</div>
                        <div className="text-xs text-slate-500">
                          {c.currentRole && c.currentCompany
                            ? `${c.currentRole} at ${c.currentCompany}`
                            : c.email}
                        </div>
                      </div>
                      <button
                        onClick={() => removeCandidate(c.id)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingId ? 'Edit' : 'Add'}{' '}
                {formType === 'submission' ? 'Candidate Submission' :
                 formType === 'task' ? 'Task' :
                 formType === 'client' ? 'Client' :
                 formType === 'recruiter' ? 'Recruiter' :
                 formType === 'candidate' ? 'Candidate' :
                 'Job Role'}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {formType === 'submission' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Candidate *</label>
                    <select
                      value={subCandidateId}
                      onChange={(e) => setSubCandidateId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select candidate</option>
                      {candidates.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                    <select
                      value={subClientId}
                      onChange={(e) => {
                        setSubClientId(e.target.value);
                        setSubJobRoleId('');
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select client</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Job Role *</label>
                    <select
                      value={subJobRoleId}
                      onChange={(e) => setSubJobRoleId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      disabled={!subClientId}
                    >
                      <option value="">Select role</option>
                      {jobRoles.filter((r) => r.clientId === subClientId).map((r) => (
                        <option key={r.id} value={r.id}>{r.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Recruiter *</label>
                    <select
                      value={subRecruiterId}
                      onChange={(e) => setSubRecruiterId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select recruiter</option>
                      {recruiters.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select
                      value={subStatus}
                      onChange={(e) => setSubStatus(e.target.value as CandidateStatus)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Next Action Date</label>
                      <input
                        type="date"
                        value={subNextActionDate}
                        onChange={(e) => setSubNextActionDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Action Description</label>
                      <input
                        type="text"
                        value={subNextActionDesc}
                        onChange={(e) => setSubNextActionDesc(e.target.value)}
                        placeholder="e.g., Follow up call"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea
                      value={subNotes}
                      onChange={(e) => setSubNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              {formType === 'task' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Recruiter *</label>
                    <select
                      value={taskRecruiterId}
                      onChange={(e) => setTaskRecruiterId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select recruiter</option>
                      {recruiters.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Task Type *</label>
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value as RecruiterTaskType)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      {Object.entries(TASK_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                      <input
                        type="date"
                        value={taskDate}
                        onChange={(e) => setTaskDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                      <input
                        type="time"
                        value={taskTime}
                        onChange={(e) => setTaskTime(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                    <input
                      type="text"
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="What did you do?"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Details</label>
                    <textarea
                      value={taskDetails}
                      onChange={(e) => setTaskDetails(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Client (optional)</label>
                      <select
                        value={taskClientId}
                        onChange={(e) => setTaskClientId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">None</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Candidate (optional)</label>
                      <select
                        value={taskCandidateId}
                        onChange={(e) => setTaskCandidateId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">None</option>
                        {candidates.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select
                      value={taskStatus}
                      onChange={(e) => setTaskStatus(e.target.value as 'completed' | 'pending')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </>
              )}

              {formType === 'client' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={clientContact}
                      onChange={(e) => setClientContact(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
                    <input
                      type="text"
                      value={clientIndustry}
                      onChange={(e) => setClientIndustry(e.target.value)}
                      placeholder="e.g., Technology, Healthcare"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              {formType === 'recruiter' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={recruiterName}
                      onChange={(e) => setRecruiterName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={recruiterEmail}
                      onChange={(e) => setRecruiterEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={recruiterPhone}
                      onChange={(e) => setRecruiterPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              {formType === 'candidate' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={candName}
                      onChange={(e) => setCandName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={candEmail}
                      onChange={(e) => setCandEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={candPhone}
                      onChange={(e) => setCandPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Current Company</label>
                      <input
                        type="text"
                        value={candCompany}
                        onChange={(e) => setCandCompany(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Current Role</label>
                      <input
                        type="text"
                        value={candRole}
                        onChange={(e) => setCandRole(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
                    <input
                      type="text"
                      value={candSource}
                      onChange={(e) => setCandSource(e.target.value)}
                      placeholder="e.g., LinkedIn, Referral"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              {formType === 'role' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Job Title *</label>
                    <input
                      type="text"
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                      placeholder="e.g., Senior Software Engineer"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                    <select
                      value={roleClientId}
                      onChange={(e) => setRoleClientId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select client</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                      <select
                        value={roleType}
                        onChange={(e) => setRoleType(e.target.value as 'full_time' | 'part_time' | 'contract')}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="full_time">Full Time</option>
                        <option value="part_time">Part Time</option>
                        <option value="contract">Contract</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                      <select
                        value={rolePriority}
                        onChange={(e) => setRolePriority(e.target.value as 'high' | 'medium' | 'low')}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (formType === 'submission') handleSubmitCandidate();
                  else if (formType === 'task') handleSubmitTask();
                  else if (formType === 'client') handleSubmitClient();
                  else if (formType === 'recruiter') handleSubmitRecruiter();
                  else if (formType === 'candidate') handleSubmitCandidateForm();
                  else if (formType === 'role') handleSubmitRole();
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recruitment;
