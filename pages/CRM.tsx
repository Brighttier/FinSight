import React, { useState, useMemo } from 'react';
import {
  Building2,
  Users,
  Handshake,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  Plus,
  Search,
  Filter,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  MessageSquare,
  FileText,
  Link2,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  X,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  Target,
  Activity,
} from 'lucide-react';
import {
  useCRM,
  CLIENT_TYPE_LABELS,
  CLIENT_TYPE_COLORS,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
  INTERACTION_TYPE_LABELS,
  CRMClientWithRelations,
} from '../hooks/useCRM';
import type {
  CRMClientInput,
  CRMDealInput,
  CRMInteractionInput,
  CRMNoteInput,
  ClientType,
  ClientSource,
  DealStage,
  InteractionType,
  CurrencyCode,
} from '../types';
import { format } from 'date-fns';
import { SUPPORTED_CURRENCIES } from '../types';

type TabType = 'clients' | 'deals' | 'activity';
type ClientViewType = 'list' | 'detail';

const CRM: React.FC = () => {
  const {
    clients,
    deals,
    interactions,
    notes,
    loading,
    unmappedContractorCustomers,
    unmappedRecruitmentClients,
    addClient,
    editClient,
    removeClient,
    addDeal,
    editDeal,
    removeDeal,
    addInteraction,
    removeInteraction,
    addNote,
    removeNote,
    importContractorCustomer,
    importRecruitmentClient,
    pipelineMetrics,
    clientMetrics,
    activityMetrics,
    followUpReminders,
    kpis,
    getClientDetails,
  } = useCRM();

  const [activeTab, setActiveTab] = useState<TabType>('clients');
  const [clientView, setClientView] = useState<ClientViewType>('list');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>('all');
  const [showClientForm, setShowClientForm] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingClient, setEditingClient] = useState<CRMClientWithRelations | null>(null);

  // Form states
  const [clientForm, setClientForm] = useState<Partial<CRMClientInput>>({
    type: 'prospect',
    status: 'active',
    isContractorClient: false,
    isRecruitmentClient: false,
  });

  const [dealForm, setDealForm] = useState<Partial<CRMDealInput>>({
    stage: 'lead',
    status: 'open',
    dealType: 'contractor_placement',
    currency: 'USD',
    value: 0,
  });

  const [interactionForm, setInteractionForm] = useState<Partial<CRMInteractionInput>>({
    type: 'call',
    status: 'completed',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const [noteForm, setNoteForm] = useState<Partial<CRMNoteInput>>({
    isPinned: false,
  });

  // Filtered clients
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch = searchTerm === '' ||
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || client.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [clients, searchTerm, typeFilter]);

  // Selected client details
  const selectedClientDetails = useMemo(() => {
    if (!selectedClientId) return null;
    return getClientDetails(selectedClientId);
  }, [selectedClientId, getClientDetails]);

  // Handle client selection
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setClientView('detail');
  };

  // Handle form submissions
  const handleSaveClient = async () => {
    if (!clientForm.name) return;

    if (editingClient) {
      await editClient(editingClient.id, clientForm as Partial<CRMClientInput>);
    } else {
      await addClient(clientForm as CRMClientInput);
    }

    setShowClientForm(false);
    setEditingClient(null);
    setClientForm({
      type: 'prospect',
      status: 'active',
      isContractorClient: false,
      isRecruitmentClient: false,
    });
  };

  const handleSaveDeal = async () => {
    if (!dealForm.title || !dealForm.clientId) return;

    const client = clients.find((c) => c.id === dealForm.clientId);
    await addDeal({
      ...dealForm,
      clientName: client?.name || '',
    } as CRMDealInput);

    setShowDealForm(false);
    setDealForm({
      stage: 'lead',
      status: 'open',
      dealType: 'contractor_placement',
      currency: 'USD',
      value: 0,
      clientId: selectedClientId || undefined,
    });
  };

  const handleSaveInteraction = async () => {
    if (!interactionForm.subject || !interactionForm.clientId) return;

    const client = clients.find((c) => c.id === interactionForm.clientId);
    await addInteraction({
      ...interactionForm,
      clientName: client?.name || '',
    } as CRMInteractionInput);

    setShowInteractionForm(false);
    setInteractionForm({
      type: 'call',
      status: 'completed',
      date: format(new Date(), 'yyyy-MM-dd'),
      clientId: selectedClientId || undefined,
    });
  };

  const handleSaveNote = async () => {
    if (!noteForm.content || !noteForm.clientId) return;

    await addNote(noteForm as CRMNoteInput);

    setShowNoteForm(false);
    setNoteForm({
      isPinned: false,
      clientId: selectedClientId || undefined,
    });
  };

  // Open forms with context
  const openDealForm = (clientId?: string) => {
    setDealForm((prev) => ({
      ...prev,
      clientId: clientId || selectedClientId || undefined,
    }));
    setShowDealForm(true);
  };

  const openInteractionForm = (clientId?: string) => {
    setInteractionForm((prev) => ({
      ...prev,
      clientId: clientId || selectedClientId || undefined,
    }));
    setShowInteractionForm(true);
  };

  const openNoteForm = (clientId?: string) => {
    setNoteForm((prev) => ({
      ...prev,
      clientId: clientId || selectedClientId || undefined,
    }));
    setShowNoteForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM</h1>
          <p className="text-sm text-slate-500 mt-1">
            Unified client management across all services
          </p>
        </div>
        <div className="flex gap-2">
          {(unmappedContractorCustomers.length > 0 || unmappedRecruitmentClients.length > 0) && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
            >
              <Link2 size={18} />
              <span className="hidden sm:inline">Import Clients</span>
              <span className="bg-amber-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {unmappedContractorCustomers.length + unmappedRecruitmentClients.length}
              </span>
            </button>
          )}
          <button
            onClick={() => {
              setEditingClient(null);
              setClientForm({
                type: 'prospect',
                status: 'active',
                isContractorClient: false,
                isRecruitmentClient: false,
              });
              setShowClientForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Client</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{kpis.totalClients}</p>
              <p className="text-xs text-slate-500">Total Clients</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{kpis.openDeals}</p>
              <p className="text-xs text-slate-500">Open Deals</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                ${(kpis.pipelineValue / 1000).toFixed(0)}k
              </p>
              <p className="text-xs text-slate-500">Pipeline Value</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {kpis.overdueFollowUps + kpis.todayFollowUps}
              </p>
              <p className="text-xs text-slate-500">Follow-ups Due</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          {(['clients', 'deals', 'activity'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab !== 'clients') {
                  setClientView('list');
                  setSelectedClientId(null);
                }
              }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'clients' && 'Clients'}
              {tab === 'deals' && 'Deals'}
              {tab === 'activity' && 'Activity'}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'clients' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client List */}
          <div className={`${clientView === 'detail' && selectedClientId ? 'hidden lg:block' : ''} lg:col-span-1`}>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Search and Filter */}
              <div className="p-4 border-b border-slate-100 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(['all', 'prospect', 'active', 'inactive', 'churned'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        typeFilter === type
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {type === 'all' ? 'All' : CLIENT_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client List */}
              <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
                {filteredClients.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    No clients found
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleSelectClient(client.id)}
                      className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                        selectedClientId === client.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-slate-900 truncate">
                              {client.name}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${CLIENT_TYPE_COLORS[client.type].bg} ${CLIENT_TYPE_COLORS[client.type].text}`}>
                              {CLIENT_TYPE_LABELS[client.type]}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 truncate mt-0.5">
                            {client.contactPerson || client.email || 'No contact'}
                          </p>
                          <div className="flex gap-3 mt-2 text-xs text-slate-400">
                            {client.isContractorClient && (
                              <span className="flex items-center gap-1">
                                <Users size={12} />
                                {client.activeAssignments} contractors
                              </span>
                            )}
                            {client.isRecruitmentClient && (
                              <span className="flex items-center gap-1">
                                <Handshake size={12} />
                                {client.placements} placed
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Client Detail / Empty State */}
          <div className={`${clientView === 'list' && !selectedClientId ? 'hidden lg:block' : ''} lg:col-span-2`}>
            {selectedClientDetails ? (
              <div className="space-y-4">
                {/* Back button (mobile) */}
                <button
                  onClick={() => {
                    setClientView('list');
                    setSelectedClientId(null);
                  }}
                  className="lg:hidden flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Back to list
                </button>

                {/* Client Header */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-900">
                          {selectedClientDetails.client.name}
                        </h2>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${CLIENT_TYPE_COLORS[selectedClientDetails.client.type].bg} ${CLIENT_TYPE_COLORS[selectedClientDetails.client.type].text}`}>
                          {CLIENT_TYPE_LABELS[selectedClientDetails.client.type]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                        {selectedClientDetails.client.contactPerson && (
                          <span>{selectedClientDetails.client.contactPerson}</span>
                        )}
                        {selectedClientDetails.client.email && (
                          <a href={`mailto:${selectedClientDetails.client.email}`} className="flex items-center gap-1 hover:text-indigo-600">
                            <Mail size={14} />
                            {selectedClientDetails.client.email}
                          </a>
                        )}
                        {selectedClientDetails.client.phone && (
                          <a href={`tel:${selectedClientDetails.client.phone}`} className="flex items-center gap-1 hover:text-indigo-600">
                            <Phone size={14} />
                            {selectedClientDetails.client.phone}
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2 mt-3">
                        {selectedClientDetails.client.isContractorClient && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            Contractor Services
                          </span>
                        )}
                        {selectedClientDetails.client.isRecruitmentClient && (
                          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                            Recruitment Services
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingClient(selectedClientDetails.client);
                        setClientForm(selectedClientDetails.client);
                        setShowClientForm(true);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      <Edit size={18} />
                    </button>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">
                        {selectedClientDetails.client.activeAssignments}
                      </p>
                      <p className="text-xs text-slate-500">Active Contractors</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">
                        ${(selectedClientDetails.client.totalContractorRevenue / 1000).toFixed(0)}k
                      </p>
                      <p className="text-xs text-slate-500">Monthly Revenue</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">
                        {selectedClientDetails.client.activeCandidates}
                      </p>
                      <p className="text-xs text-slate-500">Active Candidates</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">
                        {selectedClientDetails.client.placements}
                      </p>
                      <p className="text-xs text-slate-500">Placements</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openDealForm(selectedClientId!)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
                  >
                    <Target size={16} />
                    Add Deal
                  </button>
                  <button
                    onClick={() => openInteractionForm(selectedClientId!)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
                  >
                    <Activity size={16} />
                    Log Interaction
                  </button>
                  <button
                    onClick={() => openNoteForm(selectedClientId!)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
                  >
                    <FileText size={16} />
                    Add Note
                  </button>
                </div>

                {/* Deals Section */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Target size={18} className="text-slate-400" />
                    Deals ({selectedClientDetails.deals.length})
                  </h3>
                  {selectedClientDetails.deals.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">No deals yet</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedClientDetails.deals.map((deal) => (
                        <div
                          key={deal.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{deal.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${DEAL_STAGE_COLORS[deal.stage].bg} ${DEAL_STAGE_COLORS[deal.stage].text}`}>
                                {DEAL_STAGE_LABELS[deal.stage]}
                              </span>
                              <span className="text-xs text-slate-500">
                                {deal.expectedCloseDate && `Close: ${format(new Date(deal.expectedCloseDate), 'MMM d, yyyy')}`}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">
                              {SUPPORTED_CURRENCIES[deal.currency]?.symbol || '$'}{deal.value.toLocaleString()}
                            </p>
                            {deal.probability && (
                              <p className="text-xs text-slate-500">{deal.probability}% probability</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Activity size={18} className="text-slate-400" />
                    Recent Interactions ({selectedClientDetails.interactions.length})
                  </h3>
                  {selectedClientDetails.interactions.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">No interactions logged</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedClientDetails.interactions.slice(0, 5).map((interaction) => (
                        <div key={interaction.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            {interaction.type === 'call' && <Phone size={14} className="text-slate-600" />}
                            {interaction.type === 'email' && <Mail size={14} className="text-slate-600" />}
                            {interaction.type === 'meeting' && <Users size={14} className="text-slate-600" />}
                            {!['call', 'email', 'meeting'].includes(interaction.type) && <MessageSquare size={14} className="text-slate-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">{interaction.subject}</p>
                            <p className="text-xs text-slate-500">
                              {INTERACTION_TYPE_LABELS[interaction.type]} - {format(new Date(interaction.date), 'MMM d, yyyy')}
                            </p>
                            {interaction.description && (
                              <p className="text-sm text-slate-600 mt-1 line-clamp-2">{interaction.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <FileText size={18} className="text-slate-400" />
                    Notes ({selectedClientDetails.notes.length})
                  </h3>
                  {selectedClientDetails.notes.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">No notes yet</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedClientDetails.notes.map((note) => (
                        <div
                          key={note.id}
                          className={`p-3 rounded-lg ${note.isPinned ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}
                        >
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                          <p className="text-xs text-slate-400 mt-2">
                            {note.createdAt && format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Select a Client</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Choose a client from the list to view their 360-degree profile
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'deals' && (
        <div className="space-y-6">
          {/* Pipeline Summary */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {(['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as DealStage[]).map((stage) => (
              <div key={stage} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className={`w-3 h-3 rounded-full ${DEAL_STAGE_COLORS[stage].bg.replace('100', '500')} mb-2`}></div>
                <p className="text-2xl font-bold text-slate-900">{pipelineMetrics.stageCounts[stage]}</p>
                <p className="text-xs text-slate-500">{DEAL_STAGE_LABELS[stage]}</p>
                <p className="text-xs text-slate-400 mt-1">
                  ${(pipelineMetrics.stageValues[stage] / 1000).toFixed(0)}k
                </p>
              </div>
            ))}
          </div>

          {/* Deals Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">All Deals</h3>
              <button
                onClick={() => openDealForm()}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
              >
                <Plus size={16} />
                New Deal
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Deal</th>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-left">Stage</th>
                    <th className="px-4 py-3 text-right">Value</th>
                    <th className="px-4 py-3 text-left">Expected Close</th>
                    <th className="px-4 py-3 text-center">Probability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{deal.title}</p>
                        <p className="text-xs text-slate-500">{deal.dealType.replace('_', ' ')}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{deal.clientName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${DEAL_STAGE_COLORS[deal.stage].bg} ${DEAL_STAGE_COLORS[deal.stage].text}`}>
                          {DEAL_STAGE_LABELS[deal.stage]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {SUPPORTED_CURRENCIES[deal.currency]?.symbol || '$'}{deal.value.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {deal.expectedCloseDate ? format(new Date(deal.expectedCloseDate), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">
                        {deal.probability ? `${deal.probability}%` : '-'}
                      </td>
                    </tr>
                  ))}
                  {deals.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No deals yet. Create your first deal to start tracking your pipeline.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Summary */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-4">This Month's Activity</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(activityMetrics.interactionTypeCounts)
                  .filter(([_, count]) => count > 0)
                  .map(([type, count]) => (
                    <div key={type} className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-2xl font-bold text-slate-900">{count}</p>
                      <p className="text-xs text-slate-500">{INTERACTION_TYPE_LABELS[type as InteractionType]}</p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {interactions.slice(0, 10).map((interaction) => (
                  <div key={interaction.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      {interaction.type === 'call' && <Phone size={14} className="text-indigo-600" />}
                      {interaction.type === 'email' && <Mail size={14} className="text-indigo-600" />}
                      {interaction.type === 'meeting' && <Users size={14} className="text-indigo-600" />}
                      {!['call', 'email', 'meeting'].includes(interaction.type) && <MessageSquare size={14} className="text-indigo-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{interaction.subject}</p>
                        <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                          {INTERACTION_TYPE_LABELS[interaction.type]}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {interaction.clientName} - {format(new Date(interaction.date), 'MMM d, yyyy')}
                      </p>
                      {interaction.description && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{interaction.description}</p>
                      )}
                    </div>
                  </div>
                ))}
                {interactions.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No activity logged yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Follow-up Reminders */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-amber-500" />
                Follow-up Reminders
              </h3>
              {followUpReminders.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No pending follow-ups</p>
              ) : (
                <div className="space-y-2">
                  {followUpReminders.map((reminder) => (
                    <button
                      key={reminder.clientId}
                      onClick={() => {
                        setSelectedClientId(reminder.clientId);
                        setActiveTab('clients');
                        setClientView('detail');
                      }}
                      className={`w-full p-3 rounded-lg text-left ${
                        reminder.type === 'overdue'
                          ? 'bg-red-50 border border-red-200'
                          : reminder.type === 'today'
                          ? 'bg-amber-50 border border-amber-200'
                          : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {reminder.type === 'overdue' && (
                          <AlertCircle size={14} className="text-red-500" />
                        )}
                        {reminder.type === 'today' && (
                          <Clock size={14} className="text-amber-500" />
                        )}
                        <p className="font-medium text-slate-900">{reminder.clientName}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {reminder.type === 'overdue'
                          ? `${reminder.daysDiff} days overdue`
                          : reminder.type === 'today'
                          ? 'Due today'
                          : `Due in ${reminder.daysDiff} days`}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client Form Modal */}
      {showClientForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {editingClient ? 'Edit Client' : 'Add Client'}
              </h2>
              <button onClick={() => setShowClientForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={clientForm.name || ''}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Type
                  </label>
                  <select
                    value={clientForm.type || 'prospect'}
                    onChange={(e) => setClientForm({ ...clientForm, type: e.target.value as ClientType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(CLIENT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Source
                  </label>
                  <select
                    value={clientForm.source || ''}
                    onChange={(e) => setClientForm({ ...clientForm, source: e.target.value as ClientSource })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select source</option>
                    <option value="referral">Referral</option>
                    <option value="cold_outreach">Cold Outreach</option>
                    <option value="inbound">Inbound</option>
                    <option value="network">Network</option>
                    <option value="conference">Conference</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={clientForm.contactPerson || ''}
                  onChange={(e) => setClientForm({ ...clientForm, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={clientForm.email || ''}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={clientForm.phone || ''}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={clientForm.industry || ''}
                  onChange={(e) => setClientForm({ ...clientForm, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Next Follow-up Date
                </label>
                <input
                  type="date"
                  value={clientForm.nextFollowUpDate || ''}
                  onChange={(e) => setClientForm({ ...clientForm, nextFollowUpDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={clientForm.isContractorClient || false}
                    onChange={(e) => setClientForm({ ...clientForm, isContractorClient: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Contractor Services</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={clientForm.isRecruitmentClient || false}
                    onChange={(e) => setClientForm({ ...clientForm, isRecruitmentClient: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Recruitment Services</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={clientForm.notes || ''}
                  onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowClientForm(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClient}
                disabled={!clientForm.name}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {editingClient ? 'Update' : 'Add'} Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deal Form Modal */}
      {showDealForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Add Deal</h2>
              <button onClick={() => setShowDealForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Deal Title *
                </label>
                <input
                  type="text"
                  value={dealForm.title || ''}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Client *
                </label>
                <select
                  value={dealForm.clientId || ''}
                  onChange={(e) => setDealForm({ ...dealForm, clientId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Deal Type
                  </label>
                  <select
                    value={dealForm.dealType || 'contractor_placement'}
                    onChange={(e) => setDealForm({ ...dealForm, dealType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="contractor_placement">Contractor Placement</option>
                    <option value="recruitment">Recruitment</option>
                    <option value="consulting">Consulting</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Stage
                  </label>
                  <select
                    value={dealForm.stage || 'lead'}
                    onChange={(e) => setDealForm({ ...dealForm, stage: e.target.value as DealStage })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(DEAL_STAGE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Value
                  </label>
                  <input
                    type="number"
                    value={dealForm.value || 0}
                    onChange={(e) => setDealForm({ ...dealForm, value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={dealForm.currency || 'USD'}
                    onChange={(e) => setDealForm({ ...dealForm, currency: e.target.value as CurrencyCode })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
                      <option key={code} value={code}>{info.symbol} {info.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Expected Close
                  </label>
                  <input
                    type="date"
                    value={dealForm.expectedCloseDate || ''}
                    onChange={(e) => setDealForm({ ...dealForm, expectedCloseDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Probability (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={dealForm.probability || ''}
                    onChange={(e) => setDealForm({ ...dealForm, probability: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={dealForm.description || ''}
                  onChange={(e) => setDealForm({ ...dealForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowDealForm(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDeal}
                disabled={!dealForm.title || !dealForm.clientId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Add Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interaction Form Modal */}
      {showInteractionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Log Interaction</h2>
              <button onClick={() => setShowInteractionForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Client *
                </label>
                <select
                  value={interactionForm.clientId || ''}
                  onChange={(e) => setInteractionForm({ ...interactionForm, clientId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Type
                  </label>
                  <select
                    value={interactionForm.type || 'call'}
                    onChange={(e) => setInteractionForm({ ...interactionForm, type: e.target.value as InteractionType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(INTERACTION_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={interactionForm.date || ''}
                    onChange={(e) => setInteractionForm({ ...interactionForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={interactionForm.subject || ''}
                  onChange={(e) => setInteractionForm({ ...interactionForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={interactionForm.description || ''}
                  onChange={(e) => setInteractionForm({ ...interactionForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Next Steps
                </label>
                <textarea
                  value={interactionForm.nextSteps || ''}
                  onChange={(e) => setInteractionForm({ ...interactionForm, nextSteps: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={interactionForm.followUpDate || ''}
                  onChange={(e) => setInteractionForm({ ...interactionForm, followUpDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowInteractionForm(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInteraction}
                disabled={!interactionForm.subject || !interactionForm.clientId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Log Interaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Form Modal */}
      {showNoteForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Add Note</h2>
              <button onClick={() => setShowNoteForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Client *
                </label>
                <select
                  value={noteForm.clientId || ''}
                  onChange={(e) => setNoteForm({ ...noteForm, clientId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Note *
                </label>
                <textarea
                  value={noteForm.content || ''}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={noteForm.isPinned || false}
                  onChange={(e) => setNoteForm({ ...noteForm, isPinned: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">Pin this note</span>
              </label>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowNoteForm(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={!noteForm.content || !noteForm.clientId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Import Existing Clients</h2>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {unmappedContractorCustomers.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <Users size={18} className="text-blue-600" />
                    From Contractors ({unmappedContractorCustomers.length})
                  </h3>
                  <div className="space-y-2">
                    {unmappedContractorCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{customer.name}</p>
                          <p className="text-sm text-slate-500">{customer.email || 'No email'}</p>
                        </div>
                        <button
                          onClick={async () => {
                            await importContractorCustomer(customer);
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          Import
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {unmappedRecruitmentClients.length > 0 && (
                <div>
                  <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <Handshake size={18} className="text-purple-600" />
                    From Recruitment ({unmappedRecruitmentClients.length})
                  </h3>
                  <div className="space-y-2">
                    {unmappedRecruitmentClients.map((recClient) => (
                      <div
                        key={recClient.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{recClient.name}</p>
                          <p className="text-sm text-slate-500">{recClient.email || 'No email'}</p>
                        </div>
                        <button
                          onClick={async () => {
                            await importRecruitmentClient(recClient);
                          }}
                          className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                        >
                          Import
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {unmappedContractorCustomers.length === 0 && unmappedRecruitmentClients.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p>All clients have been imported!</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200">
              <button
                onClick={() => setShowImportModal(false)}
                className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;
