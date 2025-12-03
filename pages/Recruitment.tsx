import React, { useState, useMemo, useRef, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight,
  UserPlus,
  ClipboardList,
  AlertCircle,
  Phone,
  Mail,
  ExternalLink,
  Import,
  Upload,
  FileSpreadsheet,
  Star,
  MapPin,
  DollarSign,
  Send,
} from 'lucide-react';
import { useRecruitment, STATUS_LABELS, STATUS_COLORS, TASK_TYPE_LABELS } from '../hooks/useRecruitment';
import { useContractors } from '../hooks/useContractors';
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
  CandidateAvailability,
  Candidate,
} from '../types';
import toast from 'react-hot-toast';
import { downloadCandidateTemplate, parseCandidateExcel, exportCandidatesToExcel, ParseResult } from '../lib/excelUtils';

type ActiveTab = 'candidates' | 'pipeline' | 'tasks' | 'setup';

const AVAILABILITY_LABELS: Record<CandidateAvailability, string> = {
  available: 'Available',
  not_looking: 'Not Looking',
  placed: 'Placed',
  blacklisted: 'Blacklisted',
};

const AVAILABILITY_COLORS: Record<CandidateAvailability, string> = {
  available: 'bg-green-100 text-green-700',
  not_looking: 'bg-amber-100 text-amber-700',
  placed: 'bg-blue-100 text-blue-700',
  blacklisted: 'bg-red-100 text-red-700',
};

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
    addCandidates,
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

  // Get customers from contractors module for import
  const { customers: contractorCustomers } = useContractors({ realtime: true });

  const [activeTab, setActiveTab] = useState<ActiveTab>('candidates');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'submission' | 'task' | 'client' | 'role' | 'recruiter' | 'candidate'>('submission');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importingCustomers, setImportingCustomers] = useState(false);

  // Candidates tab state
  const [showCandidateImportModal, setShowCandidateImportModal] = useState(false);
  const [importParsing, setImportParsing] = useState(false);
  const [importResult, setImportResult] = useState<ParseResult | null>(null);
  const [importingCandidates, setImportingCandidates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [candidatesPerPage, setCandidatesPerPage] = useState(10);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());

  // Candidate filters
  const [candSearchQuery, setCandSearchQuery] = useState('');
  const [candFilterSkill, setCandFilterSkill] = useState('');
  const [candFilterExpMin, setCandFilterExpMin] = useState('');
  const [candFilterExpMax, setCandFilterExpMax] = useState('');
  const [candFilterAvailability, setCandFilterAvailability] = useState('');
  const [candFilterSource, setCandFilterSource] = useState('');
  const [candFilterLocation, setCandFilterLocation] = useState('');

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
  const [candExperience, setCandExperience] = useState('');
  const [candSkills, setCandSkills] = useState('');
  const [candCurrentSalary, setCandCurrentSalary] = useState('');
  const [candExpectedSalary, setCandExpectedSalary] = useState('');
  const [candNoticePeriod, setCandNoticePeriod] = useState('');
  const [candLocation, setCandLocation] = useState('');
  const [candLinkedinUrl, setCandLinkedinUrl] = useState('');
  const [candEducation, setCandEducation] = useState('');
  const [candAvailability, setCandAvailability] = useState<CandidateAvailability | ''>('');
  const [candNotes, setCandNotes] = useState('');

  // Quick submit state
  const [showQuickSubmitModal, setShowQuickSubmitModal] = useState(false);
  const [quickSubmitCandidateId, setQuickSubmitCandidateId] = useState('');

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

  // Filtered candidates for Candidates tab
  const filteredCandidates = useMemo(() => {
    let result = [...candidates];

    if (candSearchQuery) {
      const q = candSearchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.skills && c.skills.some(s => s.toLowerCase().includes(q))) ||
          (c.currentCompany && c.currentCompany.toLowerCase().includes(q)) ||
          (c.currentRole && c.currentRole.toLowerCase().includes(q))
      );
    }
    if (candFilterSkill) {
      result = result.filter(
        (c) => c.skills && c.skills.some(s => s.toLowerCase().includes(candFilterSkill.toLowerCase()))
      );
    }
    if (candFilterExpMin) {
      const min = parseFloat(candFilterExpMin);
      result = result.filter((c) => c.experience !== undefined && c.experience >= min);
    }
    if (candFilterExpMax) {
      const max = parseFloat(candFilterExpMax);
      result = result.filter((c) => c.experience !== undefined && c.experience <= max);
    }
    if (candFilterAvailability) {
      result = result.filter((c) => c.availability === candFilterAvailability);
    }
    if (candFilterSource) {
      result = result.filter(
        (c) => c.source && c.source.toLowerCase().includes(candFilterSource.toLowerCase())
      );
    }
    if (candFilterLocation) {
      result = result.filter(
        (c) => c.location && c.location.toLowerCase().includes(candFilterLocation.toLowerCase())
      );
    }

    return result;
  }, [candidates, candSearchQuery, candFilterSkill, candFilterExpMin, candFilterExpMax, candFilterAvailability, candFilterSource, candFilterLocation]);

  // Paginated candidates
  const paginatedCandidates = useMemo(() => {
    const start = (candidatesPage - 1) * candidatesPerPage;
    return filteredCandidates.slice(start, start + candidatesPerPage);
  }, [filteredCandidates, candidatesPage, candidatesPerPage]);

  const totalCandidatePages = Math.ceil(filteredCandidates.length / candidatesPerPage);

  // Get unique skills for filter dropdown
  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    candidates.forEach(c => c.skills?.forEach(s => skills.add(s)));
    return Array.from(skills).sort();
  }, [candidates]);

  // Get unique sources for filter dropdown
  const allSources = useMemo(() => {
    const sources = new Set<string>();
    candidates.forEach(c => c.source && sources.add(c.source));
    return Array.from(sources).sort();
  }, [candidates]);

  // Handle file selection for import
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setImportParsing(true);
    try {
      const result = await parseCandidateExcel(file);
      setImportResult(result);
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse Excel file');
    } finally {
      setImportParsing(false);
    }
  }, []);

  // Handle bulk import
  const handleBulkImport = useCallback(async () => {
    if (!importResult || importResult.valid.length === 0) return;

    setImportingCandidates(true);
    try {
      const candidatesToImport: CandidateInput[] = importResult.valid.map(({ rowNumber, errors, ...candidate }) => candidate);
      const result = await addCandidates(candidatesToImport);

      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }

      setShowCandidateImportModal(false);
      setImportResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImportingCandidates(false);
    }
  }, [importResult, addCandidates]);

  // Handle candidate selection toggle
  const toggleCandidateSelection = useCallback((id: string) => {
    setSelectedCandidates(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Select all visible candidates
  const selectAllCandidates = useCallback(() => {
    if (selectedCandidates.size === paginatedCandidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(paginatedCandidates.map(c => c.id)));
    }
  }, [paginatedCandidates, selectedCandidates.size]);

  // Delete selected candidates
  const deleteSelectedCandidates = useCallback(async () => {
    if (selectedCandidates.size === 0) return;
    if (!confirm(`Delete ${selectedCandidates.size} selected candidate(s)?`)) return;

    for (const id of selectedCandidates) {
      await removeCandidate(id);
    }
    setSelectedCandidates(new Set());
  }, [selectedCandidates, removeCandidate]);

  // Export filtered candidates
  const handleExportCandidates = useCallback(() => {
    const toExport = selectedCandidates.size > 0
      ? candidates.filter(c => selectedCandidates.has(c.id))
      : filteredCandidates;

    if (toExport.length === 0) {
      toast.error('No candidates to export');
      return;
    }

    const filename = `candidates_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    exportCandidatesToExcel(toExport, filename);
    toast.success(`Exported ${toExport.length} candidate(s)`);
  }, [candidates, filteredCandidates, selectedCandidates]);

  // Clear candidate filters
  const clearCandidateFilters = useCallback(() => {
    setCandSearchQuery('');
    setCandFilterSkill('');
    setCandFilterExpMin('');
    setCandFilterExpMax('');
    setCandFilterAvailability('');
    setCandFilterSource('');
    setCandFilterLocation('');
    setCandidatesPage(1);
  }, []);

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
    setCandExperience('');
    setCandSkills('');
    setCandCurrentSalary('');
    setCandExpectedSalary('');
    setCandNoticePeriod('');
    setCandLocation('');
    setCandLinkedinUrl('');
    setCandEducation('');
    setCandAvailability('');
    setCandNotes('');
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

    const skillsArray = candSkills
      ? candSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
      : undefined;

    const data: CandidateInput = {
      name: candName,
      email: candEmail,
      phone: candPhone || undefined,
      currentCompany: candCompany || undefined,
      currentRole: candRole || undefined,
      source: candSource || undefined,
      experience: candExperience ? parseFloat(candExperience) : undefined,
      skills: skillsArray,
      currentSalary: candCurrentSalary ? parseFloat(candCurrentSalary) : undefined,
      currentSalaryCurrency: candCurrentSalary ? 'USD' : undefined,
      expectedSalary: candExpectedSalary ? parseFloat(candExpectedSalary) : undefined,
      expectedSalaryCurrency: candExpectedSalary ? 'USD' : undefined,
      noticePeriod: candNoticePeriod || undefined,
      location: candLocation || undefined,
      linkedinUrl: candLinkedinUrl || undefined,
      education: candEducation || undefined,
      availability: candAvailability || undefined,
      notes: candNotes || undefined,
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
            { id: 'candidates', label: 'Candidates', icon: Users },
            { id: 'pipeline', label: 'Client Pipeline', icon: Briefcase },
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

      {/* Filters - shown for pipeline and tasks tabs only */}
      {activeTab !== 'candidates' && activeTab !== 'setup' && (
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
      )}

      {/* Candidates Tab */}
      {activeTab === 'candidates' && (
        <div className="space-y-4">
          {/* Candidates Filter Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, skills, company..."
                    value={candSearchQuery}
                    onChange={(e) => {
                      setCandSearchQuery(e.target.value);
                      setCandidatesPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <select
                  value={candFilterSkill}
                  onChange={(e) => {
                    setCandFilterSkill(e.target.value);
                    setCandidatesPage(1);
                  }}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Skills</option>
                  {allSkills.map((skill) => (
                    <option key={skill} value={skill}>{skill}</option>
                  ))}
                </select>

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="Min Exp"
                    value={candFilterExpMin}
                    onChange={(e) => {
                      setCandFilterExpMin(e.target.value);
                      setCandidatesPage(1);
                    }}
                    className="w-20 px-2 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={candFilterExpMax}
                    onChange={(e) => {
                      setCandFilterExpMax(e.target.value);
                      setCandidatesPage(1);
                    }}
                    className="w-20 px-2 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-500">yrs</span>
                </div>

                <select
                  value={candFilterAvailability}
                  onChange={(e) => {
                    setCandFilterAvailability(e.target.value);
                    setCandidatesPage(1);
                  }}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Availability</option>
                  {Object.entries(AVAILABILITY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>

                <select
                  value={candFilterSource}
                  onChange={(e) => {
                    setCandFilterSource(e.target.value);
                    setCandidatesPage(1);
                  }}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Sources</option>
                  {allSources.map((source) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Location"
                  value={candFilterLocation}
                  onChange={(e) => {
                    setCandFilterLocation(e.target.value);
                    setCandidatesPage(1);
                  }}
                  className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />

                {(candSearchQuery || candFilterSkill || candFilterExpMin || candFilterExpMax || candFilterAvailability || candFilterSource || candFilterLocation) && (
                  <button
                    onClick={clearCandidateFilters}
                    className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={downloadCandidateTemplate}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <FileSpreadsheet size={14} />
                  Download Template
                </button>
                <button
                  onClick={() => setShowCandidateImportModal(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                >
                  <Upload size={14} />
                  Import Excel
                </button>
                <button
                  onClick={handleExportCandidates}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50"
                >
                  <Download size={14} />
                  Export {selectedCandidates.size > 0 ? `(${selectedCandidates.size})` : 'All'}
                </button>
                {selectedCandidates.size > 0 && (
                  <button
                    onClick={deleteSelectedCandidates}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Delete ({selectedCandidates.size})
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => openFormFor('candidate')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Plus size={14} />
                  Add Candidate
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Candidates Table */}
          <Card>
            <CardContent className="p-0">
              {filteredCandidates.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No candidates found</p>
                  <div className="mt-4 flex justify-center gap-3">
                    <button
                      onClick={() => setShowCandidateImportModal(true)}
                      className="text-indigo-600 hover:underline"
                    >
                      Import from Excel
                    </button>
                    <span className="text-slate-300">or</span>
                    <button
                      onClick={() => openFormFor('candidate')}
                      className="text-indigo-600 hover:underline"
                    >
                      Add manually
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedCandidates.size === paginatedCandidates.length && paginatedCandidates.length > 0}
                              onChange={selectAllCandidates}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Contact</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Current Role</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Experience</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Skills</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Expected</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                          <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedCandidates.map((candidate) => (
                          <tr key={candidate.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedCandidates.has(candidate.id)}
                                onChange={() => toggleCandidateSelection(candidate.id)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">{candidate.name}</div>
                              {candidate.source && (
                                <div className="text-xs text-slate-400">via {candidate.source}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-0.5">
                                <a href={`mailto:${candidate.email}`} className="text-slate-600 hover:text-indigo-600 text-xs flex items-center gap-1">
                                  <Mail size={10} />
                                  {candidate.email}
                                </a>
                                {candidate.phone && (
                                  <span className="text-slate-500 text-xs flex items-center gap-1">
                                    <Phone size={10} />
                                    {candidate.phone}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {candidate.currentRole || candidate.currentCompany ? (
                                <div>
                                  <div className="text-slate-900">{candidate.currentRole || '-'}</div>
                                  {candidate.currentCompany && (
                                    <div className="text-xs text-slate-500">{candidate.currentCompany}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {candidate.experience !== undefined ? `${candidate.experience} yrs` : '-'}
                            </td>
                            <td className="px-4 py-3">
                              {candidate.skills && candidate.skills.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {candidate.skills.slice(0, 3).map((skill, idx) => (
                                    <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                                      {skill}
                                    </span>
                                  ))}
                                  {candidate.skills.length > 3 && (
                                    <span className="px-1.5 py-0.5 text-slate-400 text-xs">
                                      +{candidate.skills.length - 3}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {candidate.expectedSalary ? (
                                <div className="flex items-center gap-1 text-slate-600">
                                  <DollarSign size={12} />
                                  {candidate.expectedSalary.toLocaleString()}
                                  {candidate.expectedSalaryCurrency && (
                                    <span className="text-xs text-slate-400">{candidate.expectedSalaryCurrency}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {candidate.availability ? (
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${AVAILABILITY_COLORS[candidate.availability]}`}>
                                  {AVAILABILITY_LABELS[candidate.availability]}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">Not set</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setQuickSubmitCandidateId(candidate.id);
                                    setShowQuickSubmitModal(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 rounded"
                                  title="Quick Submit to Job"
                                >
                                  <Send size={14} />
                                </button>
                                {candidate.linkedinUrl && (
                                  <a
                                    href={candidate.linkedinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                                  >
                                    <ExternalLink size={14} />
                                  </a>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingId(candidate.id);
                                    setFormType('candidate');
                                    setCandName(candidate.name);
                                    setCandEmail(candidate.email);
                                    setCandPhone(candidate.phone || '');
                                    setCandCompany(candidate.currentCompany || '');
                                    setCandRole(candidate.currentRole || '');
                                    setCandSource(candidate.source || '');
                                    setCandExperience(candidate.experience?.toString() || '');
                                    setCandSkills(candidate.skills?.join(', ') || '');
                                    setCandCurrentSalary(candidate.currentSalary?.toString() || '');
                                    setCandExpectedSalary(candidate.expectedSalary?.toString() || '');
                                    setCandNoticePeriod(candidate.noticePeriod || '');
                                    setCandLocation(candidate.location || '');
                                    setCandLinkedinUrl(candidate.linkedinUrl || '');
                                    setCandEducation(candidate.education || '');
                                    setCandAvailability(candidate.availability || '');
                                    setCandNotes(candidate.notes || '');
                                    setShowForm(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Delete this candidate?')) {
                                      removeCandidate(candidate.id);
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

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>Showing {((candidatesPage - 1) * candidatesPerPage) + 1}-{Math.min(candidatesPage * candidatesPerPage, filteredCandidates.length)} of {filteredCandidates.length}</span>
                      <select
                        value={candidatesPerPage}
                        onChange={(e) => {
                          setCandidatesPerPage(Number(e.target.value));
                          setCandidatesPage(1);
                        }}
                        className="px-2 py-1 border border-slate-200 rounded text-sm"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                      <span>per page</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCandidatesPage(p => Math.max(1, p - 1))}
                        disabled={candidatesPage === 1}
                        className="p-1.5 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {Array.from({ length: Math.min(5, totalCandidatePages) }, (_, i) => {
                        let pageNum;
                        if (totalCandidatePages <= 5) {
                          pageNum = i + 1;
                        } else if (candidatesPage <= 3) {
                          pageNum = i + 1;
                        } else if (candidatesPage >= totalCandidatePages - 2) {
                          pageNum = totalCandidatePages - 4 + i;
                        } else {
                          pageNum = candidatesPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCandidatesPage(pageNum)}
                            className={`px-3 py-1 text-sm rounded ${
                              candidatesPage === pageNum
                                ? 'bg-indigo-600 text-white'
                                : 'border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCandidatesPage(p => Math.min(totalCandidatePages, p + 1))}
                        disabled={candidatesPage === totalCandidatePages || totalCandidatePages === 0}
                        className="p-1.5 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
              <div className="flex items-center gap-2">
                {contractorCustomers.length > 0 && (
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700"
                  >
                    <Import size={14} />
                    Import
                  </button>
                )}
                <button
                  onClick={() => openFormFor('client')}
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {clients.length === 0 ? (
                <p className="p-4 text-center text-slate-500 text-sm">
                  No clients yet
                  {contractorCustomers.length > 0 && (
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="ml-1 text-amber-600 hover:text-amber-700 underline"
                    >
                      Import from Contractors
                    </button>
                  )}
                </p>
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
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={candPhone}
                        onChange={(e) => setCandPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn URL</label>
                      <input
                        type="url"
                        value={candLinkedinUrl}
                        onChange={(e) => setCandLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
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
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Experience (years)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={candExperience}
                        onChange={(e) => setCandExperience(e.target.value)}
                        placeholder="e.g., 5"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                      <input
                        type="text"
                        value={candLocation}
                        onChange={(e) => setCandLocation(e.target.value)}
                        placeholder="e.g., San Francisco, CA"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Notice Period</label>
                      <input
                        type="text"
                        value={candNoticePeriod}
                        onChange={(e) => setCandNoticePeriod(e.target.value)}
                        placeholder="e.g., 30 days"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Skills (comma-separated)</label>
                    <input
                      type="text"
                      value={candSkills}
                      onChange={(e) => setCandSkills(e.target.value)}
                      placeholder="e.g., React, TypeScript, Node.js"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Current Salary (USD)</label>
                      <input
                        type="number"
                        min="0"
                        value={candCurrentSalary}
                        onChange={(e) => setCandCurrentSalary(e.target.value)}
                        placeholder="e.g., 120000"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Expected Salary (USD)</label>
                      <input
                        type="number"
                        min="0"
                        value={candExpectedSalary}
                        onChange={(e) => setCandExpectedSalary(e.target.value)}
                        placeholder="e.g., 150000"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Education</label>
                      <input
                        type="text"
                        value={candEducation}
                        onChange={(e) => setCandEducation(e.target.value)}
                        placeholder="e.g., BS Computer Science"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Availability</label>
                    <select
                      value={candAvailability}
                      onChange={(e) => setCandAvailability(e.target.value as CandidateAvailability | '')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select availability</option>
                      {Object.entries(AVAILABILITY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea
                      value={candNotes}
                      onChange={(e) => setCandNotes(e.target.value)}
                      rows={2}
                      placeholder="Additional notes about the candidate..."
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

      {/* Import from Contractors Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Import Clients from Contractors</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-600 mb-4">
                Select customers from your Contractors module to import as Recruitment clients.
                Already imported clients are marked.
              </p>
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {contractorCustomers.map((customer) => {
                  const alreadyImported = clients.some(
                    (c) => c.name.toLowerCase() === customer.name.toLowerCase()
                  );
                  return (
                    <label
                      key={customer.id}
                      className={`flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer ${
                        alreadyImported ? 'opacity-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={alreadyImported}
                        data-customer-id={customer.id}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{customer.name}</div>
                        {customer.contactPerson && (
                          <div className="text-xs text-slate-500">{customer.contactPerson}</div>
                        )}
                      </div>
                      {alreadyImported && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Already imported
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100 rounded-b-xl">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-700 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const checkboxes = document.querySelectorAll<HTMLInputElement>(
                    'input[data-customer-id]:checked'
                  );
                  if (checkboxes.length === 0) {
                    toast.error('Select at least one customer to import');
                    return;
                  }
                  setImportingCustomers(true);
                  let imported = 0;
                  for (const checkbox of checkboxes) {
                    const customerId = checkbox.getAttribute('data-customer-id');
                    const customer = contractorCustomers.find((c) => c.id === customerId);
                    if (customer) {
                      const clientData: RecruitmentClientInput = {
                        name: customer.name,
                        contactPerson: customer.contactPerson || '',
                        email: customer.email || '',
                        phone: customer.phone || '',
                        industry: '',
                        status: 'active',
                      };
                      await addClient(clientData);
                      imported++;
                    }
                  }
                  setImportingCustomers(false);
                  setShowImportModal(false);
                  toast.success(`Imported ${imported} client${imported > 1 ? 's' : ''}`);
                }}
                disabled={importingCustomers}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {importingCustomers && <Loader2 size={14} className="animate-spin" />}
                Import Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Import Modal */}
      {showCandidateImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Import Candidates from Excel</h3>
              <button
                onClick={() => {
                  setShowCandidateImportModal(false);
                  setImportResult(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  importResult ? 'border-slate-200 bg-slate-50' : 'border-indigo-200 hover:border-indigo-300 bg-indigo-50/50'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
                    handleFileSelect(fakeEvent);
                  }
                }}
              >
                {importParsing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <p className="text-slate-600">Parsing file...</p>
                  </div>
                ) : importResult ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
                    <p className="text-slate-900 font-medium">File loaded successfully</p>
                    <button
                      onClick={() => {
                        setImportResult(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      Choose different file
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
                    <p className="text-slate-600 mb-2">Drop Excel file here or click to browse</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="candidate-file-input"
                    />
                    <label
                      htmlFor="candidate-file-input"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer text-sm font-medium"
                    >
                      Select File
                    </label>
                  </>
                )}
              </div>

              {/* Download Template Link */}
              <div className="mt-4 text-center">
                <button
                  onClick={downloadCandidateTemplate}
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <FileSpreadsheet size={14} />
                  Download template for correct format
                </button>
              </div>

              {/* Parse Results */}
              {importResult && (
                <div className="mt-6 space-y-4">
                  {/* Summary */}
                  <div className="flex gap-4 text-sm">
                    <div className="flex-1 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-emerald-700 font-medium">{importResult.valid.length} valid</p>
                      <p className="text-emerald-600 text-xs">Ready to import</p>
                    </div>
                    {importResult.invalid.length > 0 && (
                      <div className="flex-1 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-red-700 font-medium">{importResult.invalid.length} invalid</p>
                        <p className="text-red-600 text-xs">Will be skipped</p>
                      </div>
                    )}
                    <div className="flex-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-slate-700 font-medium">{importResult.totalRows} total</p>
                      <p className="text-slate-600 text-xs">Rows in file</p>
                    </div>
                  </div>

                  {/* Preview Table */}
                  {importResult.valid.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        Preview (first 5 rows):
                      </p>
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium text-slate-600">Name</th>
                              <th className="text-left px-3 py-2 font-medium text-slate-600">Email</th>
                              <th className="text-left px-3 py-2 font-medium text-slate-600">Skills</th>
                              <th className="text-left px-3 py-2 font-medium text-slate-600">Experience</th>
                              <th className="text-left px-3 py-2 font-medium text-slate-600">Expected Salary</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {importResult.valid.slice(0, 5).map((cand, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 text-slate-900">{cand.name}</td>
                                <td className="px-3 py-2 text-slate-600">{cand.email}</td>
                                <td className="px-3 py-2 text-slate-600">
                                  {cand.skills?.slice(0, 2).join(', ') || '-'}
                                  {cand.skills && cand.skills.length > 2 && '...'}
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  {cand.experience !== undefined ? `${cand.experience} yrs` : '-'}
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  {cand.expectedSalary
                                    ? `${cand.expectedSalary.toLocaleString()} ${cand.expectedSalaryCurrency || ''}`
                                    : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Invalid Rows */}
                  {importResult.invalid.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-red-700 mb-2">
                        Rows with issues (will be skipped):
                      </p>
                      <div className="bg-red-50 rounded-lg p-3 text-xs text-red-700 max-h-32 overflow-y-auto space-y-1">
                        {importResult.invalid.map((cand, idx) => (
                          <div key={idx}>
                            <span className="font-medium">Row {cand.rowNumber}:</span>{' '}
                            {cand.errors.join(', ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowCandidateImportModal(false);
                  setImportResult(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-700 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                disabled={!importResult || importResult.valid.length === 0 || importingCandidates}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importingCandidates && <Loader2 size={14} className="animate-spin" />}
                Import {importResult?.valid.length || 0} Candidate{importResult?.valid.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Submit Modal */}
      {showQuickSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Quick Submit Candidate</h3>
              <button
                onClick={() => {
                  setShowQuickSubmitModal(false);
                  setQuickSubmitCandidateId('');
                  setSubClientId('');
                  setSubJobRoleId('');
                  setSubRecruiterId('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Candidate Info */}
              {(() => {
                const selectedCandidate = candidates.find(c => c.id === quickSubmitCandidateId);
                if (!selectedCandidate) return null;
                return (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="font-medium text-slate-900">{selectedCandidate.name}</div>
                    <div className="text-sm text-slate-500">{selectedCandidate.email}</div>
                    {selectedCandidate.currentRole && selectedCandidate.currentCompany && (
                      <div className="text-sm text-slate-600 mt-1">
                        {selectedCandidate.currentRole} at {selectedCandidate.currentCompany}
                      </div>
                    )}
                    {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedCandidate.skills.slice(0, 5).map((skill, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 bg-slate-200 text-slate-600 text-xs rounded">
                            {skill}
                          </span>
                        ))}
                        {selectedCandidate.skills.length > 5 && (
                          <span className="text-xs text-slate-400">+{selectedCandidate.skills.length - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Client *</label>
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

              {/* Job Role Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Job Role *</label>
                <select
                  value={subJobRoleId}
                  onChange={(e) => setSubJobRoleId(e.target.value)}
                  disabled={!subClientId}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select job role</option>
                  {jobRoles
                    .filter((r) => r.clientId === subClientId && r.status === 'open')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} {r.priority === 'high' ? '(High Priority)' : ''}
                      </option>
                    ))}
                </select>
                {subClientId && jobRoles.filter((r) => r.clientId === subClientId && r.status === 'open').length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">No open roles for this client</p>
                )}
              </div>

              {/* Recruiter Selection */}
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
            </div>
            <div className="flex justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100 rounded-b-xl">
              <button
                onClick={() => {
                  setShowQuickSubmitModal(false);
                  setQuickSubmitCandidateId('');
                  setSubClientId('');
                  setSubJobRoleId('');
                  setSubRecruiterId('');
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-700 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!quickSubmitCandidateId || !subClientId || !subJobRoleId || !subRecruiterId) {
                    toast.error('Please fill in all required fields');
                    return;
                  }

                  const candidate = candidates.find((c) => c.id === quickSubmitCandidateId);
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
                    status: 'submitted_to_client',
                    dateSubmitted: format(new Date(), 'yyyy-MM-dd'),
                  };

                  await addSubmission(data);
                  setShowQuickSubmitModal(false);
                  setQuickSubmitCandidateId('');
                  setSubClientId('');
                  setSubJobRoleId('');
                  setSubRecruiterId('');
                  toast.success(`${candidate.name} submitted to ${role.title} at ${client.name}`);
                }}
                disabled={!quickSubmitCandidateId || !subClientId || !subJobRoleId || !subRecruiterId}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send size={14} />
                Submit Candidate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recruitment;
