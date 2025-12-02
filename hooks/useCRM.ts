import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToCRMClients,
  subscribeToCRMDeals,
  subscribeToCRMInteractions,
  subscribeToCRMNotes,
  subscribeToCustomers,
  subscribeToRecruitmentClients,
  subscribeToAssignments,
  subscribeToCandidateSubmissions,
  createCRMClient,
  updateCRMClient,
  deleteCRMClient,
  createCRMDeal,
  updateCRMDeal,
  deleteCRMDeal,
  createCRMInteraction,
  updateCRMInteraction,
  deleteCRMInteraction,
  createCRMNote,
  updateCRMNote,
  deleteCRMNote,
} from '../services/firestoreService';
import type {
  CRMClient,
  CRMClientInput,
  CRMDeal,
  CRMDealInput,
  CRMInteraction,
  CRMInteractionInput,
  CRMNote,
  CRMNoteInput,
  Customer,
  RecruitmentClient,
  ContractorAssignment,
  CandidateSubmission,
  ClientType,
  DealStage,
  InteractionType,
} from '../types';
import toast from 'react-hot-toast';
import { format, differenceInDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';

interface UseCRMOptions {
  realtime?: boolean;
}

// Type/Stage labels
export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  prospect: 'Prospect',
  active: 'Active',
  inactive: 'Inactive',
  churned: 'Churned',
};

export const CLIENT_TYPE_COLORS: Record<ClientType, { bg: string; text: string }> = {
  prospect: { bg: 'bg-blue-100', text: 'text-blue-700' },
  active: { bg: 'bg-green-100', text: 'text-green-700' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-700' },
  churned: { bg: 'bg-red-100', text: 'text-red-700' },
};

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

export const DEAL_STAGE_COLORS: Record<DealStage, { bg: string; text: string }> = {
  lead: { bg: 'bg-slate-100', text: 'text-slate-700' },
  qualified: { bg: 'bg-blue-100', text: 'text-blue-700' },
  proposal: { bg: 'bg-purple-100', text: 'text-purple-700' },
  negotiation: { bg: 'bg-amber-100', text: 'text-amber-700' },
  closed_won: { bg: 'bg-green-100', text: 'text-green-700' },
  closed_lost: { bg: 'bg-red-100', text: 'text-red-700' },
};

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  demo: 'Demo',
  proposal_sent: 'Proposal Sent',
  contract_signed: 'Contract Signed',
  follow_up: 'Follow Up',
  other: 'Other',
};

// Extended CRM Client with related data
export interface CRMClientWithRelations extends CRMClient {
  // Contractor module data
  activeAssignments: number;
  totalContractorRevenue: number;
  // Recruitment module data
  openJobRoles: number;
  activeCandidates: number;
  placements: number;
  // CRM specific
  dealCount: number;
  openDealValue: number;
  interactionCount: number;
  lastInteraction?: string;
  noteCount: number;
}

export function useCRM(options: UseCRMOptions = {}) {
  const { user } = useAuth();
  const { realtime = true } = options;

  // CRM native data
  const [clients, setClients] = useState<CRMClient[]>([]);
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [interactions, setInteractions] = useState<CRMInteraction[]>([]);
  const [notes, setNotes] = useState<CRMNote[]>([]);

  // Related module data for enrichment
  const [contractorCustomers, setContractorCustomers] = useState<Customer[]>([]);
  const [recruitmentClients, setRecruitmentClients] = useState<RecruitmentClient[]>([]);
  const [assignments, setAssignments] = useState<ContractorAssignment[]>([]);
  const [submissions, setSubmissions] = useState<CandidateSubmission[]>([]);

  const [loading, setLoading] = useState(true);

  // Subscribe to all data
  useEffect(() => {
    if (!user?.uid || !realtime) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let loadedCount = 0;
    const totalCollections = 8;

    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalCollections) {
        setLoading(false);
      }
    };

    // CRM native subscriptions
    const unsubClients = subscribeToCRMClients(user.uid, (data) => {
      setClients(data);
      checkLoaded();
    });

    const unsubDeals = subscribeToCRMDeals(user.uid, (data) => {
      setDeals(data);
      checkLoaded();
    });

    const unsubInteractions = subscribeToCRMInteractions(user.uid, (data) => {
      setInteractions(data);
      checkLoaded();
    });

    const unsubNotes = subscribeToCRMNotes(user.uid, (data) => {
      setNotes(data);
      checkLoaded();
    });

    // Related module subscriptions for data enrichment
    const unsubCustomers = subscribeToCustomers(user.uid, (data) => {
      setContractorCustomers(data);
      checkLoaded();
    });

    const unsubRecruitmentClients = subscribeToRecruitmentClients(user.uid, (data) => {
      setRecruitmentClients(data);
      checkLoaded();
    });

    const unsubAssignments = subscribeToAssignments(user.uid, (data) => {
      setAssignments(data);
      checkLoaded();
    });

    const unsubSubmissions = subscribeToCandidateSubmissions(user.uid, (data) => {
      setSubmissions(data);
      checkLoaded();
    });

    return () => {
      unsubClients();
      unsubDeals();
      unsubInteractions();
      unsubNotes();
      unsubCustomers();
      unsubRecruitmentClients();
      unsubAssignments();
      unsubSubmissions();
    };
  }, [user?.uid, realtime]);

  // ============ UNIFIED CLIENT VIEW ============
  // Merge CRM clients with data from contractor and recruitment modules
  const unifiedClients = useMemo((): CRMClientWithRelations[] => {
    return clients.map((client) => {
      // Find related contractor customer
      const legacyCustomer = client.legacyCustomerId
        ? contractorCustomers.find((c) => c.id === client.legacyCustomerId)
        : contractorCustomers.find((c) => c.name.toLowerCase() === client.name.toLowerCase());

      // Find related recruitment client
      const legacyRecruitmentClient = client.legacyRecruitmentClientId
        ? recruitmentClients.find((c) => c.id === client.legacyRecruitmentClientId)
        : recruitmentClients.find((c) => c.name.toLowerCase() === client.name.toLowerCase());

      // Get contractor assignments for this client
      const clientAssignments = legacyCustomer
        ? assignments.filter((a) => a.customerId === legacyCustomer.id && a.status === 'active')
        : [];

      // Get recruitment submissions for this client
      const clientSubmissions = legacyRecruitmentClient
        ? submissions.filter((s) => s.clientId === legacyRecruitmentClient.id)
        : [];

      // Get deals for this client
      const clientDeals = deals.filter((d) => d.clientId === client.id);
      const openDeals = clientDeals.filter((d) => d.status === 'open');

      // Get interactions for this client
      const clientInteractions = interactions.filter((i) => i.clientId === client.id);
      const lastInteraction = clientInteractions.length > 0
        ? clientInteractions.sort((a, b) => b.date.localeCompare(a.date))[0].date
        : undefined;

      // Get notes for this client
      const clientNotes = notes.filter((n) => n.clientId === client.id);

      return {
        ...client,
        // Contractor module stats
        activeAssignments: clientAssignments.length,
        totalContractorRevenue: clientAssignments.reduce((sum, a) => {
          // Calculate monthly revenue estimate
          return sum + (a.externalDayRate * a.standardDaysPerMonth);
        }, 0),
        // Recruitment module stats
        openJobRoles: 0, // Would need jobRoles subscription
        activeCandidates: clientSubmissions.filter(
          (s) => !['rejected', 'withdrawn', 'placed'].includes(s.status)
        ).length,
        placements: clientSubmissions.filter((s) => s.status === 'placed').length,
        // CRM stats
        dealCount: clientDeals.length,
        openDealValue: openDeals.reduce((sum, d) => sum + d.value, 0),
        interactionCount: clientInteractions.length,
        lastInteraction,
        noteCount: clientNotes.length,
      };
    });
  }, [clients, contractorCustomers, recruitmentClients, assignments, submissions, deals, interactions, notes]);

  // ============ CLIENT CRUD ============
  const addClient = useCallback(async (data: CRMClientInput): Promise<string | null> => {
    if (!user?.uid) return null;
    try {
      const id = await createCRMClient(user.uid, data);
      toast.success('Client added');
      return id;
    } catch (err) {
      toast.error('Failed to add client');
      return null;
    }
  }, [user?.uid]);

  const editClient = useCallback(async (id: string, data: Partial<CRMClientInput>): Promise<boolean> => {
    try {
      await updateCRMClient(id, data);
      toast.success('Client updated');
      return true;
    } catch (err) {
      toast.error('Failed to update client');
      return false;
    }
  }, []);

  const removeClient = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteCRMClient(id);
      toast.success('Client deleted');
      return true;
    } catch (err) {
      toast.error('Failed to delete client');
      return false;
    }
  }, []);

  // ============ DEAL CRUD ============
  const addDeal = useCallback(async (data: CRMDealInput): Promise<string | null> => {
    if (!user?.uid) return null;
    try {
      const id = await createCRMDeal(user.uid, data);
      toast.success('Deal added');
      return id;
    } catch (err) {
      toast.error('Failed to add deal');
      return null;
    }
  }, [user?.uid]);

  const editDeal = useCallback(async (id: string, data: Partial<CRMDealInput>): Promise<boolean> => {
    try {
      await updateCRMDeal(id, data);
      toast.success('Deal updated');
      return true;
    } catch (err) {
      toast.error('Failed to update deal');
      return false;
    }
  }, []);

  const removeDeal = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteCRMDeal(id);
      toast.success('Deal deleted');
      return true;
    } catch (err) {
      toast.error('Failed to delete deal');
      return false;
    }
  }, []);

  // ============ INTERACTION CRUD ============
  const addInteraction = useCallback(async (data: CRMInteractionInput): Promise<string | null> => {
    if (!user?.uid) return null;
    try {
      const id = await createCRMInteraction(user.uid, data);
      toast.success('Interaction logged');
      return id;
    } catch (err) {
      toast.error('Failed to log interaction');
      return null;
    }
  }, [user?.uid]);

  const editInteraction = useCallback(async (id: string, data: Partial<CRMInteractionInput>): Promise<boolean> => {
    try {
      await updateCRMInteraction(id, data);
      toast.success('Interaction updated');
      return true;
    } catch (err) {
      toast.error('Failed to update interaction');
      return false;
    }
  }, []);

  const removeInteraction = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteCRMInteraction(id);
      toast.success('Interaction deleted');
      return true;
    } catch (err) {
      toast.error('Failed to delete interaction');
      return false;
    }
  }, []);

  // ============ NOTE CRUD ============
  const addNote = useCallback(async (data: CRMNoteInput): Promise<string | null> => {
    if (!user?.uid) return null;
    try {
      const id = await createCRMNote(user.uid, data);
      toast.success('Note added');
      return id;
    } catch (err) {
      toast.error('Failed to add note');
      return null;
    }
  }, [user?.uid]);

  const editNote = useCallback(async (id: string, data: Partial<CRMNoteInput>): Promise<boolean> => {
    try {
      await updateCRMNote(id, data);
      toast.success('Note updated');
      return true;
    } catch (err) {
      toast.error('Failed to update note');
      return false;
    }
  }, []);

  const removeNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteCRMNote(id);
      toast.success('Note deleted');
      return true;
    } catch (err) {
      toast.error('Failed to delete note');
      return false;
    }
  }, []);

  // ============ IMPORT FROM LEGACY MODULES ============
  // Find contractor customers not yet in CRM
  const unmappedContractorCustomers = useMemo(() => {
    return contractorCustomers.filter((customer) => {
      // Check if already mapped by legacy ID
      const mappedById = clients.some((c) => c.legacyCustomerId === customer.id);
      if (mappedById) return false;

      // Check if name match exists
      const mappedByName = clients.some(
        (c) => c.name.toLowerCase() === customer.name.toLowerCase()
      );
      return !mappedByName;
    });
  }, [contractorCustomers, clients]);

  // Find recruitment clients not yet in CRM
  const unmappedRecruitmentClients = useMemo(() => {
    return recruitmentClients.filter((recClient) => {
      const mappedById = clients.some((c) => c.legacyRecruitmentClientId === recClient.id);
      if (mappedById) return false;

      const mappedByName = clients.some(
        (c) => c.name.toLowerCase() === recClient.name.toLowerCase()
      );
      return !mappedByName;
    });
  }, [recruitmentClients, clients]);

  // Import a contractor customer into CRM
  const importContractorCustomer = useCallback(async (customer: Customer): Promise<string | null> => {
    if (!user?.uid) return null;

    const clientData: CRMClientInput = {
      name: customer.name,
      contactPerson: customer.contactPerson,
      email: customer.email,
      phone: customer.phone,
      type: customer.status === 'active' ? 'active' : 'inactive',
      isContractorClient: true,
      isRecruitmentClient: false,
      legacyCustomerId: customer.id,
      status: customer.status,
    };

    try {
      const id = await createCRMClient(user.uid, clientData);
      toast.success(`Imported ${customer.name} from Contractors`);
      return id;
    } catch (err) {
      console.error('Failed to import contractor customer:', err);
      toast.error(`Failed to import ${customer.name}`);
      return null;
    }
  }, [user?.uid]);

  // Import a recruitment client into CRM
  const importRecruitmentClient = useCallback(async (recClient: RecruitmentClient): Promise<string | null> => {
    if (!user?.uid) return null;

    const clientData: CRMClientInput = {
      name: recClient.name,
      contactPerson: recClient.contactPerson,
      email: recClient.email,
      phone: recClient.phone,
      industry: recClient.industry,
      type: recClient.status === 'active' ? 'active' : 'inactive',
      isContractorClient: false,
      isRecruitmentClient: true,
      legacyRecruitmentClientId: recClient.id,
      status: recClient.status,
    };

    try {
      const id = await createCRMClient(user.uid, clientData);
      toast.success(`Imported ${recClient.name} from Recruitment`);
      return id;
    } catch (err) {
      console.error('Failed to import recruitment client:', err);
      toast.error(`Failed to import ${recClient.name}`);
      return null;
    }
  }, [user?.uid]);

  // Link an existing CRM client to a contractor customer
  const linkToContractorCustomer = useCallback(async (
    clientId: string,
    customerId: string
  ): Promise<boolean> => {
    try {
      await updateCRMClient(clientId, {
        legacyCustomerId: customerId,
        isContractorClient: true,
      });
      toast.success('Linked to contractor customer');
      return true;
    } catch (err) {
      toast.error('Failed to link');
      return false;
    }
  }, []);

  // Link an existing CRM client to a recruitment client
  const linkToRecruitmentClient = useCallback(async (
    clientId: string,
    recruitmentClientId: string
  ): Promise<boolean> => {
    try {
      await updateCRMClient(clientId, {
        legacyRecruitmentClientId: recruitmentClientId,
        isRecruitmentClient: true,
      });
      toast.success('Linked to recruitment client');
      return true;
    } catch (err) {
      toast.error('Failed to link');
      return false;
    }
  }, []);

  // ============ ANALYTICS & METRICS ============

  // Deal pipeline metrics
  const pipelineMetrics = useMemo(() => {
    const openDeals = deals.filter((d) => d.status === 'open');
    const stageCounts: Record<DealStage, number> = {
      lead: 0,
      qualified: 0,
      proposal: 0,
      negotiation: 0,
      closed_won: 0,
      closed_lost: 0,
    };

    const stageValues: Record<DealStage, number> = {
      lead: 0,
      qualified: 0,
      proposal: 0,
      negotiation: 0,
      closed_won: 0,
      closed_lost: 0,
    };

    deals.forEach((d) => {
      stageCounts[d.stage]++;
      stageValues[d.stage] += d.value;
    });

    const totalPipeline = openDeals.reduce((sum, d) => sum + d.value, 0);
    const weightedPipeline = openDeals.reduce((sum, d) => {
      const weight = (d.probability || 50) / 100;
      return sum + d.value * weight;
    }, 0);

    return {
      totalDeals: deals.length,
      openDeals: openDeals.length,
      totalPipelineValue: totalPipeline,
      weightedPipelineValue: weightedPipeline,
      stageCounts,
      stageValues,
      wonDeals: stageCounts.closed_won,
      lostDeals: stageCounts.closed_lost,
      winRate: (stageCounts.closed_won + stageCounts.closed_lost) > 0
        ? (stageCounts.closed_won / (stageCounts.closed_won + stageCounts.closed_lost)) * 100
        : 0,
    };
  }, [deals]);

  // Client summary metrics
  const clientMetrics = useMemo(() => {
    const typeCounts: Record<ClientType, number> = {
      prospect: 0,
      active: 0,
      inactive: 0,
      churned: 0,
    };

    clients.forEach((c) => {
      typeCounts[c.type]++;
    });

    const withContractor = clients.filter((c) => c.isContractorClient).length;
    const withRecruitment = clients.filter((c) => c.isRecruitmentClient).length;
    const withBoth = clients.filter((c) => c.isContractorClient && c.isRecruitmentClient).length;

    return {
      total: clients.length,
      typeCounts,
      withContractorServices: withContractor,
      withRecruitmentServices: withRecruitment,
      withBothServices: withBoth,
    };
  }, [clients]);

  // Activity summary
  const activityMetrics = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const thisMonthInteractions = interactions.filter(
      (i) => i.date >= monthStart && i.date <= monthEnd
    );

    const interactionTypeCounts: Record<InteractionType, number> = {
      call: 0,
      email: 0,
      meeting: 0,
      demo: 0,
      proposal_sent: 0,
      contract_signed: 0,
      follow_up: 0,
      other: 0,
    };

    thisMonthInteractions.forEach((i) => {
      interactionTypeCounts[i.type]++;
    });

    return {
      totalInteractions: interactions.length,
      thisMonthInteractions: thisMonthInteractions.length,
      interactionTypeCounts,
      totalNotes: notes.length,
    };
  }, [interactions, notes]);

  // Follow-up reminders
  const followUpReminders = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    const reminders: {
      type: 'overdue' | 'today' | 'upcoming';
      clientId: string;
      clientName: string;
      followUpDate: string;
      daysDiff: number;
    }[] = [];

    clients.forEach((client) => {
      if (!client.nextFollowUpDate) return;

      const daysDiff = differenceInDays(new Date(client.nextFollowUpDate), today);

      if (daysDiff < 0) {
        reminders.push({
          type: 'overdue',
          clientId: client.id,
          clientName: client.name,
          followUpDate: client.nextFollowUpDate,
          daysDiff: Math.abs(daysDiff),
        });
      } else if (daysDiff === 0) {
        reminders.push({
          type: 'today',
          clientId: client.id,
          clientName: client.name,
          followUpDate: client.nextFollowUpDate,
          daysDiff: 0,
        });
      } else if (daysDiff <= 7) {
        reminders.push({
          type: 'upcoming',
          clientId: client.id,
          clientName: client.name,
          followUpDate: client.nextFollowUpDate,
          daysDiff,
        });
      }
    });

    // Sort: overdue first, then today, then upcoming
    return reminders.sort((a, b) => {
      const typeOrder = { overdue: 0, today: 1, upcoming: 2 };
      if (typeOrder[a.type] !== typeOrder[b.type]) {
        return typeOrder[a.type] - typeOrder[b.type];
      }
      return a.daysDiff - b.daysDiff;
    });
  }, [clients]);

  // Dashboard KPIs
  const kpis = useMemo(() => {
    const quarterStart = format(startOfQuarter(new Date()), 'yyyy-MM-dd');
    const quarterEnd = format(endOfQuarter(new Date()), 'yyyy-MM-dd');

    const quarterWonDeals = deals.filter(
      (d) => d.stage === 'closed_won' && d.actualCloseDate &&
             d.actualCloseDate >= quarterStart && d.actualCloseDate <= quarterEnd
    );

    return {
      totalClients: clients.length,
      activeClients: clients.filter((c) => c.type === 'active').length,
      prospects: clients.filter((c) => c.type === 'prospect').length,
      openDeals: deals.filter((d) => d.status === 'open').length,
      pipelineValue: deals.filter((d) => d.status === 'open').reduce((sum, d) => sum + d.value, 0),
      quarterRevenue: quarterWonDeals.reduce((sum, d) => sum + d.value, 0),
      overdueFollowUps: followUpReminders.filter((r) => r.type === 'overdue').length,
      todayFollowUps: followUpReminders.filter((r) => r.type === 'today').length,
    };
  }, [clients, deals, followUpReminders]);

  // Get client details with all related data
  const getClientDetails = useCallback((clientId: string) => {
    const client = unifiedClients.find((c) => c.id === clientId);
    if (!client) return null;

    const clientDeals = deals.filter((d) => d.clientId === clientId);
    const clientInteractions = interactions.filter((i) => i.clientId === clientId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const clientNotes = notes.filter((n) => n.clientId === clientId)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });

    return {
      client,
      deals: clientDeals,
      interactions: clientInteractions,
      notes: clientNotes,
    };
  }, [unifiedClients, deals, interactions, notes]);

  return {
    // Data
    clients: unifiedClients,
    deals,
    interactions,
    notes,
    loading,

    // Raw data for linking
    contractorCustomers,
    recruitmentClients,
    unmappedContractorCustomers,
    unmappedRecruitmentClients,

    // Client CRUD
    addClient,
    editClient,
    removeClient,

    // Deal CRUD
    addDeal,
    editDeal,
    removeDeal,

    // Interaction CRUD
    addInteraction,
    editInteraction,
    removeInteraction,

    // Note CRUD
    addNote,
    editNote,
    removeNote,

    // Import/Link functions
    importContractorCustomer,
    importRecruitmentClient,
    linkToContractorCustomer,
    linkToRecruitmentClient,

    // Analytics
    pipelineMetrics,
    clientMetrics,
    activityMetrics,
    followUpReminders,
    kpis,

    // Helpers
    getClientDetails,
  };
}
