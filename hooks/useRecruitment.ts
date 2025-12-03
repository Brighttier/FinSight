import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToRecruitmentClients,
  subscribeToJobRoles,
  subscribeToRecruiters,
  subscribeToCandidates,
  subscribeToCandidateSubmissions,
  subscribeToRecruiterTasks,
  createRecruitmentClient,
  updateRecruitmentClient,
  deleteRecruitmentClient,
  createJobRole,
  updateJobRole,
  deleteJobRole,
  createRecruiter,
  updateRecruiter,
  deleteRecruiter,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  createCandidateSubmission,
  updateCandidateSubmission,
  deleteCandidateSubmission,
  createRecruiterTask,
  updateRecruiterTask,
  deleteRecruiterTask,
} from '../services/firestoreService';
import type {
  RecruitmentClient,
  RecruitmentClientInput,
  JobRole,
  JobRoleInput,
  Recruiter,
  RecruiterInput,
  Candidate,
  CandidateInput,
  CandidateSubmission,
  CandidateSubmissionInput,
  RecruiterTask,
  RecruiterTaskInput,
  CandidateStatus,
} from '../types';
import toast from 'react-hot-toast';
import { format, differenceInDays, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

interface UseRecruitmentOptions {
  realtime?: boolean;
}

// Status display helpers
export const STATUS_LABELS: Record<CandidateStatus, string> = {
  sourced: 'Sourced',
  submitted_to_client: 'Submitted to Client',
  client_review: 'Client Review',
  interview_scheduled: 'Interview Scheduled',
  interview_completed: 'Interview Completed',
  offer_stage: 'Offer Stage',
  offer_extended: 'Offer Extended',
  offer_accepted: 'Offer Accepted',
  placed: 'Placed',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const STATUS_COLORS: Record<CandidateStatus, { bg: string; text: string; border: string }> = {
  sourced: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  submitted_to_client: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  client_review: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  interview_scheduled: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  interview_completed: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  offer_stage: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  offer_extended: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  offer_accepted: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  placed: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  withdrawn: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
};

export const TASK_TYPE_LABELS: Record<string, string> = {
  candidate_sourcing: 'Candidate Sourcing',
  candidate_submission: 'Candidate Submission',
  client_communication: 'Client Communication',
  interview_coordination: 'Interview Coordination',
  offer_negotiation: 'Offer Negotiation',
  follow_up: 'Follow Up',
  reference_check: 'Reference Check',
  onboarding: 'Onboarding',
  other: 'Other',
};

export function useRecruitment(options: UseRecruitmentOptions = {}) {
  const { user } = useAuth();
  const { realtime = true } = options;

  const [clients, setClients] = useState<RecruitmentClient[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [submissions, setSubmissions] = useState<CandidateSubmission[]>([]);
  const [tasks, setTasks] = useState<RecruiterTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to all recruitment data
  useEffect(() => {
    if (!user?.uid || !realtime) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let loadedCount = 0;
    const totalCollections = 6;

    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalCollections) {
        setLoading(false);
      }
    };

    const unsubClients = subscribeToRecruitmentClients(user.uid, (data) => {
      setClients(data);
      checkLoaded();
    });

    const unsubRoles = subscribeToJobRoles(user.uid, (data) => {
      setJobRoles(data);
      checkLoaded();
    });

    const unsubRecruiters = subscribeToRecruiters(user.uid, (data) => {
      setRecruiters(data);
      checkLoaded();
    });

    const unsubCandidates = subscribeToCandidates(user.uid, (data) => {
      setCandidates(data);
      checkLoaded();
    });

    const unsubSubmissions = subscribeToCandidateSubmissions(user.uid, (data) => {
      setSubmissions(data);
      checkLoaded();
    });

    const unsubTasks = subscribeToRecruiterTasks(user.uid, (data) => {
      setTasks(data);
      checkLoaded();
    });

    return () => {
      unsubClients();
      unsubRoles();
      unsubRecruiters();
      unsubCandidates();
      unsubSubmissions();
      unsubTasks();
    };
  }, [user?.uid, realtime]);

  // ============ CLIENT CRUD ============
  const addClient = useCallback(async (data: RecruitmentClientInput): Promise<string | null> => {
    if (!user?.uid) return null;
    try {
      const id = await createRecruitmentClient(user.uid, data);
      toast.success('Client added');
      return id;
    } catch (err) {
      toast.error('Failed to add client');
      return null;
    }
  }, [user?.uid]);

  const editClient = useCallback(async (id: string, data: Partial<RecruitmentClientInput>): Promise<boolean> => {
    try {
      await updateRecruitmentClient(id, data);
      toast.success('Client updated');
      return true;
    } catch (err) {
      toast.error('Failed to update client');
      return false;
    }
  }, []);

  const removeClient = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteRecruitmentClient(id);
      toast.success('Client deleted');
      return true;
    } catch (err) {
      toast.error('Failed to delete client');
      return false;
    }
  }, []);

  // ============ JOB ROLE CRUD ============
  const addJobRole = useCallback(async (data: JobRoleInput): Promise<string | null> => {
    if (!user?.uid) return null;
    try {
      const id = await createJobRole(user.uid, data);
      toast.success('Job role added');
      return id;
    } catch (err) {
      toast.error('Failed to add job role');
      return null;
    }
  }, [user?.uid]);

  const editJobRole = useCallback(async (id: string, data: Partial<JobRoleInput>): Promise<boolean> => {
    try {
      await updateJobRole(id, data);
      toast.success('Job role updated');
      return true;
    } catch (err) {
      toast.error('Failed to update job role');
      return false;
    }
  }, []);

  const removeJobRole = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteJobRole(id);
      toast.success('Job role deleted');
      return true;
    } catch (err) {
      toast.error('Failed to delete job role');
      return false;
    }
  }, []);

  // ============ RECRUITER CRUD ============
  const addRecruiter = useCallback(async (data: RecruiterInput): Promise<string | null> => {
    if (!user?.uid) return null;
    try {
      const id = await createRecruiter(user.uid, data);
      toast.success('Recruiter added');
      return id;
    } catch (err) {
      toast.error('Failed to add recruiter');
      return null;
    }
  }, [user?.uid]);

  const editRecruiter = useCallback(async (id: string, data: Partial<RecruiterInput>): Promise<boolean> => {
    try {
      await updateRecruiter(id, data);
      toast.success('Recruiter updated');
      return true;
    } catch (err) {
      toast.error('Failed to update recruiter');
      return false;
    }
  }, []);

  const removeRecruiter = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteRecruiter(id);
      toast.success('Recruiter deleted');
      return true;
    } catch (err) {
      toast.error('Failed to delete recruiter');
      return false;
    }
  }, []);

  // ============ CANDIDATE CRUD ============
  const addCandidate = useCallback(async (data: CandidateInput): Promise<string | null> => {
    if (!user?.uid) return null;
    try {
      const id = await createCandidate(user.uid, data);
      toast.success('Candidate added');
      return id;
    } catch (err) {
      toast.error('Failed to add candidate');
      return null;
    }
  }, [user?.uid]);

  // Bulk import candidates
  const addCandidates = useCallback(async (dataList: CandidateInput[]): Promise<{ imported: number; skipped: number; errors: string[] }> => {
    if (!user?.uid) return { imported: 0, skipped: 0, errors: ['User not authenticated'] };

    const results = { imported: 0, skipped: 0, errors: [] as string[] };
    const existingEmails = new Set(candidates.map(c => c.email.toLowerCase()));

    for (const data of dataList) {
      // Skip if email already exists
      if (existingEmails.has(data.email.toLowerCase())) {
        results.skipped++;
        continue;
      }

      try {
        await createCandidate(user.uid, data);
        results.imported++;
        existingEmails.add(data.email.toLowerCase()); // Track newly added emails
      } catch (err: any) {
        results.errors.push(`Failed to import ${data.name}: ${err.message || 'Unknown error'}`);
      }
    }

    if (results.imported > 0) {
      toast.success(`Imported ${results.imported} candidate${results.imported > 1 ? 's' : ''}`);
    }
    if (results.skipped > 0) {
      toast(`Skipped ${results.skipped} duplicate${results.skipped > 1 ? 's' : ''}`, { icon: 'i' });
    }

    return results;
  }, [user?.uid, candidates]);

  const editCandidate = useCallback(async (id: string, data: Partial<CandidateInput>): Promise<boolean> => {
    try {
      await updateCandidate(id, data);
      toast.success('Candidate updated');
      return true;
    } catch (err) {
      toast.error('Failed to update candidate');
      return false;
    }
  }, []);

  const removeCandidate = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteCandidate(id);
      toast.success('Candidate deleted');
      return true;
    } catch (err) {
      toast.error('Failed to delete candidate');
      return false;
    }
  }, []);

  // ============ SUBMISSION CRUD ============
  const addSubmission = useCallback(async (data: CandidateSubmissionInput): Promise<string | null> => {
    if (!user?.uid) return null;
    try {
      const id = await createCandidateSubmission(user.uid, data);
      toast.success('Candidate submitted');
      return id;
    } catch (err) {
      toast.error('Failed to submit candidate');
      return null;
    }
  }, [user?.uid]);

  const editSubmission = useCallback(async (id: string, data: Partial<CandidateSubmissionInput>): Promise<boolean> => {
    try {
      await updateCandidateSubmission(id, data);
      toast.success('Submission updated');
      return true;
    } catch (err) {
      toast.error('Failed to update submission');
      return false;
    }
  }, []);

  const removeSubmission = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteCandidateSubmission(id);
      toast.success('Submission deleted');
      return true;
    } catch (err) {
      toast.error('Failed to delete submission');
      return false;
    }
  }, []);

  // ============ TASK CRUD ============
  const addTask = useCallback(async (data: RecruiterTaskInput): Promise<string | null> => {
    if (!user?.uid) return null;
    try {
      const id = await createRecruiterTask(user.uid, data);
      toast.success('Task logged');
      return id;
    } catch (err) {
      toast.error('Failed to log task');
      return null;
    }
  }, [user?.uid]);

  const editTask = useCallback(async (id: string, data: Partial<RecruiterTaskInput>): Promise<boolean> => {
    try {
      await updateRecruiterTask(id, data);
      toast.success('Task updated');
      return true;
    } catch (err) {
      toast.error('Failed to update task');
      return false;
    }
  }, []);

  const removeTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteRecruiterTask(id);
      toast.success('Task deleted');
      return true;
    } catch (err) {
      toast.error('Failed to delete task');
      return false;
    }
  }, []);

  // ============ ANALYTICS & METRICS ============

  // Calculate funnel metrics
  const funnelMetrics = useMemo(() => {
    const activeSubmissions = submissions.filter(
      (s) => !['rejected', 'withdrawn', 'placed'].includes(s.status)
    );

    const statusCounts = submissions.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<CandidateStatus, number>);

    const total = submissions.length;
    const submitted = statusCounts.submitted_to_client || 0;
    const inReview = (statusCounts.client_review || 0) + (statusCounts.submitted_to_client || 0);
    const interviews = (statusCounts.interview_scheduled || 0) + (statusCounts.interview_completed || 0);
    const offers = (statusCounts.offer_stage || 0) + (statusCounts.offer_extended || 0) + (statusCounts.offer_accepted || 0);
    const placed = statusCounts.placed || 0;

    return {
      total,
      submitted: total,
      inReview,
      interviews,
      offers,
      placed,
      conversionRates: {
        submitToReview: total > 0 ? (inReview / total) * 100 : 0,
        reviewToInterview: inReview > 0 ? (interviews / inReview) * 100 : 0,
        interviewToOffer: interviews > 0 ? (offers / interviews) * 100 : 0,
        offerToPlacement: offers > 0 ? (placed / offers) * 100 : 0,
      },
      statusCounts,
    };
  }, [submissions]);

  // Calculate recruiter performance
  const recruiterMetrics = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');

    return recruiters.map((r) => {
      const recruiterSubmissions = submissions.filter((s) => s.recruiterId === r.id);
      const thisWeekSubmissions = recruiterSubmissions.filter(
        (s) => s.dateSubmitted >= weekStart && s.dateSubmitted <= weekEnd
      );
      const recruiterTasks = tasks.filter((t) => t.recruiterId === r.id);
      const thisWeekTasks = recruiterTasks.filter(
        (t) => t.date >= weekStart && t.date <= weekEnd
      );

      const interviews = thisWeekSubmissions.filter(
        (s) => s.status === 'interview_scheduled' || s.status === 'interview_completed'
      ).length;

      const clientCalls = thisWeekTasks.filter(
        (t) => t.taskType === 'client_communication'
      ).length;

      const placements = recruiterSubmissions.filter((s) => s.status === 'placed').length;
      const placementFees = recruiterSubmissions
        .filter((s) => s.status === 'placed' && s.placementFee)
        .reduce((sum, s) => sum + (s.placementFee || 0), 0);

      return {
        recruiterId: r.id,
        recruiterName: r.name,
        totalSubmissions: recruiterSubmissions.length,
        thisWeekSubmissions: thisWeekSubmissions.length,
        thisWeekInterviews: interviews,
        thisWeekClientCalls: clientCalls,
        totalPlacements: placements,
        totalFees: placementFees,
        activePipeline: recruiterSubmissions.filter(
          (s) => !['rejected', 'withdrawn', 'placed'].includes(s.status)
        ).length,
      };
    });
  }, [recruiters, submissions, tasks]);

  // Items needing attention
  const attentionItems = useMemo(() => {
    const today = new Date();
    const items: {
      type: 'stale' | 'upcoming_interview' | 'no_activity' | 'pending_offer';
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      relatedId?: string;
    }[] = [];

    // Stale candidates (no update in 5+ days)
    submissions.forEach((s) => {
      if (['rejected', 'withdrawn', 'placed'].includes(s.status)) return;

      const lastUpdate = s.lastClientUpdate || s.dateSubmitted;
      const daysSinceUpdate = differenceInDays(today, new Date(lastUpdate));

      if (daysSinceUpdate >= 5) {
        items.push({
          type: 'stale',
          title: `Stale Candidate: ${s.candidateName}`,
          description: `Awaiting feedback from ${s.clientName} for ${daysSinceUpdate} days`,
          priority: daysSinceUpdate >= 7 ? 'high' : 'medium',
          relatedId: s.id,
        });
      }
    });

    // Upcoming interviews
    submissions.forEach((s) => {
      if (s.status === 'interview_scheduled' && s.interviewDate) {
        const daysUntil = differenceInDays(new Date(s.interviewDate), today);
        if (daysUntil >= 0 && daysUntil <= 3) {
          items.push({
            type: 'upcoming_interview',
            title: `Upcoming Interview: ${s.candidateName}`,
            description: `Interview with ${s.clientName} in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
            priority: daysUntil === 0 ? 'high' : 'medium',
            relatedId: s.id,
          });
        }
      }
    });

    // Roles with no recent submissions
    jobRoles.forEach((role) => {
      if (role.status !== 'open') return;

      const roleSubmissions = submissions.filter((s) => s.jobRoleId === role.id);
      const recentSubmissions = roleSubmissions.filter((s) => {
        const daysSince = differenceInDays(today, new Date(s.dateSubmitted));
        return daysSince <= 7;
      });

      if (recentSubmissions.length === 0) {
        items.push({
          type: 'no_activity',
          title: `No Recent Activity: ${role.title}`,
          description: `Role at ${role.clientName} has no new submissions this week`,
          priority: 'low',
          relatedId: role.id,
        });
      }
    });

    // Pending offers
    submissions.forEach((s) => {
      if (s.status === 'offer_extended' && s.offerStatus === 'pending') {
        const daysSinceOffer = s.lastClientUpdate
          ? differenceInDays(today, new Date(s.lastClientUpdate))
          : 0;

        items.push({
          type: 'pending_offer',
          title: `Pending Offer: ${s.candidateName}`,
          description: `Awaiting decision for ${s.clientName} role`,
          priority: daysSinceOffer >= 3 ? 'high' : 'medium',
          relatedId: s.id,
        });
      }
    });

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [submissions, jobRoles]);

  // Dashboard KPIs
  const kpis = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');
    const quarterStart = format(startOfQuarter(new Date()), 'yyyy-MM-dd');
    const quarterEnd = format(endOfQuarter(new Date()), 'yyyy-MM-dd');

    const activeSubmissions = submissions.filter(
      (s) => !['rejected', 'withdrawn', 'placed'].includes(s.status)
    );

    const thisWeekInterviews = submissions.filter(
      (s) => s.interviewDate && s.interviewDate >= weekStart && s.interviewDate <= weekEnd
    );

    const pendingOffers = submissions.filter(
      (s) => s.status === 'offer_stage' || s.status === 'offer_extended'
    );

    const quarterPlacements = submissions.filter(
      (s) => s.status === 'placed' && s.placementDate &&
             s.placementDate >= quarterStart && s.placementDate <= quarterEnd
    );

    return {
      activeSubmissions: activeSubmissions.length,
      interviewsThisWeek: thisWeekInterviews.length,
      pendingOffers: pendingOffers.length,
      placementsThisQuarter: quarterPlacements.length,
      openRoles: jobRoles.filter((r) => r.status === 'open').length,
      activeRecruiters: recruiters.filter((r) => r.status === 'active').length,
      totalCandidates: candidates.length,
      totalClients: clients.filter((c) => c.status === 'active').length,
    };
  }, [submissions, jobRoles, recruiters, candidates, clients]);

  return {
    // Data
    clients,
    jobRoles,
    recruiters,
    candidates,
    submissions,
    tasks,
    loading,

    // Client CRUD
    addClient,
    editClient,
    removeClient,

    // Job Role CRUD
    addJobRole,
    editJobRole,
    removeJobRole,

    // Recruiter CRUD
    addRecruiter,
    editRecruiter,
    removeRecruiter,

    // Candidate CRUD
    addCandidate,
    addCandidates,
    editCandidate,
    removeCandidate,

    // Submission CRUD
    addSubmission,
    editSubmission,
    removeSubmission,

    // Task CRUD
    addTask,
    editTask,
    removeTask,

    // Analytics
    funnelMetrics,
    recruiterMetrics,
    attentionItems,
    kpis,
  };
}
