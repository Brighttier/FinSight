import React from 'react';

export type UserRole = 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';

// ============ USER MANAGEMENT & PERMISSIONS ============

// All available pages/modules in the application
export type AppModule =
  | 'dashboard'
  | 'pnl'
  | 'cashflow'
  | 'transactions'
  | 'subscriptions'
  | 'contractors'
  | 'team_payroll'
  | 'recruitment'
  | 'crm'
  | 'profit_share'
  | 'forecast'
  | 'settings'
  | 'user_management';

// Permission levels for each module
export type PermissionLevel = 'none' | 'view' | 'edit' | 'full';

// Module permissions structure
export type ModulePermissions = Record<AppModule, PermissionLevel>;

// Default permissions by role
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, ModulePermissions> = {
  owner: {
    dashboard: 'full',
    pnl: 'full',
    cashflow: 'full',
    transactions: 'full',
    subscriptions: 'full',
    contractors: 'full',
    team_payroll: 'full',
    recruitment: 'full',
    crm: 'full',
    profit_share: 'full',
    forecast: 'full',
    settings: 'full',
    user_management: 'full',
  },
  admin: {
    dashboard: 'full',
    pnl: 'full',
    cashflow: 'full',
    transactions: 'full',
    subscriptions: 'full',
    contractors: 'full',
    team_payroll: 'full',
    recruitment: 'full',
    crm: 'full',
    profit_share: 'view',
    forecast: 'full',
    settings: 'edit',
    user_management: 'edit',
  },
  manager: {
    dashboard: 'view',
    pnl: 'view',
    cashflow: 'view',
    transactions: 'edit',
    subscriptions: 'edit',
    contractors: 'full',
    team_payroll: 'view',
    recruitment: 'full',
    crm: 'full',
    profit_share: 'none',
    forecast: 'view',
    settings: 'view',
    user_management: 'none',
  },
  employee: {
    dashboard: 'view',
    pnl: 'none',
    cashflow: 'none',
    transactions: 'view',
    subscriptions: 'view',
    contractors: 'edit',
    team_payroll: 'none',
    recruitment: 'edit',
    crm: 'edit',
    profit_share: 'none',
    forecast: 'none',
    settings: 'view',
    user_management: 'none',
  },
  viewer: {
    dashboard: 'view',
    pnl: 'view',
    cashflow: 'view',
    transactions: 'view',
    subscriptions: 'view',
    contractors: 'view',
    team_payroll: 'none',
    recruitment: 'view',
    crm: 'view',
    profit_share: 'none',
    forecast: 'view',
    settings: 'none',
    user_management: 'none',
  },
};

// Module display info
export const MODULE_INFO: Record<AppModule, { label: string; description: string }> = {
  dashboard: { label: 'Dashboard', description: 'View main dashboard and KPIs' },
  pnl: { label: 'P&L', description: 'Profit & Loss statements' },
  cashflow: { label: 'Cash Flow', description: 'Cash flow statement and tracking' },
  transactions: { label: 'Transactions', description: 'Manage income and expenses' },
  subscriptions: { label: 'Subscriptions', description: 'Track SaaS subscriptions' },
  contractors: { label: 'Contractors', description: 'Manage contractors and timesheets' },
  team_payroll: { label: 'Team & Payroll', description: 'Internal staff and payroll' },
  recruitment: { label: 'Recruitment', description: 'Job placements and candidates' },
  crm: { label: 'CRM', description: 'Client relationship management' },
  profit_share: { label: 'Profit Share', description: 'Partner profit distribution' },
  forecast: { label: 'Forecast', description: 'Financial projections' },
  settings: { label: 'Settings', description: 'Application settings' },
  user_management: { label: 'User Management', description: 'Manage users and permissions' },
};

// Organization/Company
export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  // Financial settings
  bankBalance?: number;
  lastBankBalanceUpdate?: string; // ISO date string
  retentionPercentage?: number; // 0-100, percentage of profit to retain (not distribute)
  distributionNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Organization financial update input
export type OrganizationFinancialsInput = Pick<Organization, 'bankBalance' | 'lastBankBalanceUpdate' | 'retentionPercentage' | 'distributionNotes'>;

// App User with permissions
export interface AppUser {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: ModulePermissions;
  isActive: boolean;
  lastLoginAt?: Date;
  invitedBy?: string;
  invitedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// User invitation
export interface UserInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
  permissions: ModulePermissions;
  invitedBy: string;
  invitedByName: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: Date;
  createdAt?: Date;
}

// Input types
export type AppUserInput = Omit<AppUser, 'id' | 'createdAt' | 'updatedAt'>;
export type UserInvitationInput = Omit<UserInvitation, 'id' | 'createdAt'>;

// Supported currencies for contractor payments
export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'SGD';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
};

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Metric {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

export type TransactionCategory =
  | 'revenue'
  | 'payroll'
  | 'contractors'
  | 'software'
  | 'marketing'
  | 'office'
  | 'travel'
  | 'utilities'
  | 'legal'
  | 'taxes'
  | 'reimbursements'
  | 'other';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentTerms = 'immediate' | 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'net_90';
export type PaymentMethod = 'bank_transfer' | 'check' | 'credit_card' | 'cash' | 'other';

// Payment record - tracks individual payments against transactions/timesheets
export interface Payment {
  id: string;
  userId: string;
  // Link to original record (one of these will be set)
  transactionId?: string;
  timesheetId?: string;
  // Payment details
  amount: number;
  paymentDate: string; // ISO date
  paymentMethod?: PaymentMethod;
  paymentReference?: string; // Check #, wire ref, etc.
  notes?: string;
  // Metadata
  createdBy: string; // User ID who recorded payment
  createdAt?: Date;
  updatedAt?: Date;
}

export type PaymentInput = Omit<Payment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

export interface Transaction {
  id: string;
  userId: string;
  date: string; // ISO String - Invoice/transaction date (accrual basis)
  description: string;
  category: TransactionCategory;
  amount: number;
  type: 'revenue' | 'expense';
  status: 'draft' | 'posted';
  receiptUrl?: string;
  notes?: string;
  // Invoice tracking (for revenue)
  invoiceNumber?: string;
  invoiceDate?: string; // ISO date when invoice was sent
  // Payment tracking for cash basis accounting
  paymentStatus?: PaymentStatus;
  paymentDate?: string; // ISO date when payment was received/made
  paymentTerms?: PaymentTerms;
  amountPaid?: number; // For partial payments - legacy, use payments collection
  totalPaid?: number; // Sum of all payments from payments collection
  expectedPaymentDate?: string; // Calculated from date + terms
  paymentReference?: string; // Check number, wire reference, etc. - legacy
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  vendor: string;
  cost: number;
  billingCycle: 'monthly' | 'annual';
  nextBillingDate: string;
  status: 'active' | 'cancelled' | 'paused';
  category?: string;
  notes?: string;
  savingsOpportunity?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Partner {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  sharePercentage: number;
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Distribution {
  id: string;
  partnerId: string;
  partnerName: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed';
  createdAt?: Date;
}

export interface Forecast {
  id: string;
  userId: string;
  scenario: 'base' | 'optimistic' | 'conservative';
  data: ForecastDataPoint[];
  insights: string[];
  generatedAt: Date;
  createdAt?: Date;
}

export interface ForecastDataPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  confidenceLow?: number;
  confidenceHigh?: number;
}

export interface ChartDataPoint {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface UserSettings {
  userId: string;
  currency: string;
  dateFormat: string;
  notifications: {
    email: boolean;
    billReminders: boolean;
    weeklyReport: boolean;
  };
  updatedAt?: Date;
}

// ============ CONTRACTOR MODULE ============

export interface Customer {
  id: string;
  userId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Contractor {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  skills?: string[];
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ContractorAssignment {
  id: string;
  userId: string;
  contractorId: string;
  contractorName: string;
  customerId: string;
  customerName: string;
  customerContactEmail?: string;
  internalDayRate: number;
  internalCurrency: CurrencyCode;
  internalDayRateUSD?: number; // Converted rate for calculations
  externalDayRate: number;
  externalCurrency: CurrencyCode; // Usually USD
  exchangeRate?: number; // Internal currency to USD rate used at time of creation/update
  standardHoursPerDay: number;
  standardDaysPerMonth: number;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  contractFileUrl?: string;
  contractFileName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type InvoiceStatus = 'not_invoiced' | 'invoiced' | 'paid' | 'partial';

export interface ContractorTimesheet {
  id: string;
  userId: string;
  assignmentId: string;
  contractorId: string;
  contractorName: string;
  customerId: string;
  customerName: string;
  month: string;
  standardDaysWorked: number;
  overtimeDays: number;
  overtimeHours: number;
  internalDayRate: number;
  internalCurrency: CurrencyCode;
  internalDayRateUSD: number; // Converted rate for calculations
  externalDayRate: number;
  externalCurrency: CurrencyCode;
  exchangeRate: number; // Rate used for this timesheet
  totalDaysWorked: number;
  internalCost: number; // In original currency
  internalCostUSD: number; // Converted to USD
  externalRevenue: number; // In USD
  profit: number; // In USD (externalRevenue - internalCostUSD)
  status: 'draft' | 'submitted' | 'approved';
  // Customer invoice payment tracking (money IN)
  invoiceStatus?: InvoiceStatus;
  invoiceNumber?: string;
  invoiceDate?: string; // ISO date when invoice was sent
  customerPaymentDate?: string; // ISO date when customer paid
  customerAmountPaid?: number; // For partial payments
  // Contractor payment tracking (money OUT)
  contractorPaymentStatus?: 'unpaid' | 'paid';
  contractorPaymentDate?: string; // ISO date when contractor was paid
  createdAt?: Date;
  updatedAt?: Date;
}

// ============ TEAM/PAYROLL MODULE ============

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  monthlySalary: number;
  currency: CurrencyCode;
  startDate: string;
  endDate?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PayrollRecord {
  id: string;
  userId: string;
  teamMemberId: string;
  teamMemberName: string;
  month: string; // YYYY-MM format
  baseSalary: number;
  bonus?: number;
  deductions?: number;
  netAmount: number;
  currency: CurrencyCode;
  status: 'pending' | 'paid';
  paidDate?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Form input types (for creating/updating)
export type TeamMemberInput = Omit<TeamMember, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type PayrollRecordInput = Omit<PayrollRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type TransactionInput = Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type SubscriptionInput = Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type PartnerInput = Omit<Partner, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type CustomerInput = Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type ContractorInput = Omit<Contractor, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type ContractorAssignmentInput = Omit<ContractorAssignment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type ContractorTimesheetInput = Omit<ContractorTimesheet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

// ============ RECRUITMENT MODULE ============

export type CandidateStatus =
  | 'sourced'
  | 'submitted_to_client'
  | 'client_review'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'offer_stage'
  | 'offer_extended'
  | 'offer_accepted'
  | 'placed'
  | 'rejected'
  | 'withdrawn';

export type RecruiterTaskType =
  | 'candidate_sourcing'
  | 'candidate_submission'
  | 'client_communication'
  | 'interview_coordination'
  | 'offer_negotiation'
  | 'follow_up'
  | 'reference_check'
  | 'onboarding'
  | 'other';

export interface RecruitmentClient {
  id: string;
  userId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  industry?: string;
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface JobRole {
  id: string;
  userId: string;
  clientId: string;
  clientName: string;
  title: string;
  description?: string;
  requirements?: string[];
  salaryRange?: { min: number; max: number; currency: CurrencyCode };
  location?: string;
  type: 'full_time' | 'part_time' | 'contract';
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'on_hold' | 'filled' | 'cancelled';
  openDate: string;
  targetFillDate?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Recruiter {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  specializations?: string[];
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export type CandidateAvailability = 'available' | 'not_looking' | 'placed' | 'blacklisted';

export interface Candidate {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  currentCompany?: string;
  currentRole?: string;
  experience?: number; // years
  skills?: string[];
  resumeUrl?: string;
  resumeFileName?: string;
  linkedinUrl?: string;
  source?: string; // e.g., LinkedIn, Referral, Job Board
  notes?: string;
  // Extended fields for candidate database
  currentSalary?: number;
  currentSalaryCurrency?: CurrencyCode;
  expectedSalary?: number;
  expectedSalaryCurrency?: CurrencyCode;
  noticePeriod?: string; // e.g., "30 days", "Immediate"
  location?: string;
  preferredLocations?: string[];
  education?: string;
  portfolioUrl?: string;
  availability?: CandidateAvailability;
  rating?: 1 | 2 | 3 | 4 | 5;
  lastContactDate?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CandidateSubmission {
  id: string;
  userId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  clientId: string;
  clientName: string;
  jobRoleId: string;
  jobRoleTitle: string;
  recruiterId: string;
  recruiterName: string;
  status: CandidateStatus;
  dateSubmitted: string;
  lastClientUpdate?: string;
  lastClientResponse?: string;
  nextActionDate?: string;
  nextActionDescription?: string;
  interviewDate?: string;
  interviewType?: 'phone' | 'video' | 'onsite' | 'technical' | 'final';
  offerAmount?: number;
  offerCurrency?: CurrencyCode;
  offerStatus?: 'pending' | 'accepted' | 'rejected' | 'negotiating';
  placementDate?: string;
  placementFee?: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RecruiterTask {
  id: string;
  userId: string;
  recruiterId: string;
  recruiterName: string;
  taskType: RecruiterTaskType;
  date: string;
  time: string;
  description: string;
  details?: string;
  clientId?: string;
  clientName?: string;
  candidateId?: string;
  candidateName?: string;
  submissionId?: string;
  duration?: number; // minutes
  status: 'completed' | 'pending' | 'cancelled';
  createdAt?: Date;
  updatedAt?: Date;
}

// Input types for forms
export type RecruitmentClientInput = Omit<RecruitmentClient, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type JobRoleInput = Omit<JobRole, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type RecruiterInput = Omit<Recruiter, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type CandidateInput = Omit<Candidate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type CandidateSubmissionInput = Omit<CandidateSubmission, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type RecruiterTaskInput = Omit<RecruiterTask, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

// ============ UNIFIED CRM MODULE ============

// Unified Client that serves as the single source of truth
// Links to: Contractor Customers, Recruitment Clients
export type ClientType = 'prospect' | 'active' | 'inactive' | 'churned';
export type ClientSource = 'referral' | 'cold_outreach' | 'inbound' | 'network' | 'conference' | 'other';
export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
export type InteractionType = 'call' | 'email' | 'meeting' | 'demo' | 'proposal_sent' | 'contract_signed' | 'follow_up' | 'other';

export interface CRMClient {
  id: string;
  userId: string;
  name: string;
  // Contact info
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedinUrl?: string;
  // Company details
  industry?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'enterprise';
  location?: string;
  address?: string;
  // CRM specific
  type: ClientType;
  source?: ClientSource;
  tags?: string[];
  assignedTo?: string; // Team member/recruiter responsible
  // Service flags - what services this client uses
  isContractorClient: boolean; // Uses contractor staffing services
  isRecruitmentClient: boolean; // Uses recruitment services
  // Legacy IDs for migration/linking
  legacyCustomerId?: string; // Old Customer ID from contractor module
  legacyRecruitmentClientId?: string; // Old RecruitmentClient ID
  // Financials
  totalRevenue?: number;
  lifetimeValue?: number;
  // Timestamps
  firstContactDate?: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CRMDeal {
  id: string;
  userId: string;
  clientId: string;
  clientName: string;
  title: string;
  description?: string;
  // Deal details
  dealType: 'contractor_placement' | 'recruitment' | 'consulting' | 'other';
  stage: DealStage;
  probability?: number; // 0-100%
  value: number;
  currency: CurrencyCode;
  // Timeline
  expectedCloseDate?: string;
  actualCloseDate?: string;
  // Related entities
  relatedJobRoleId?: string;
  relatedAssignmentId?: string;
  // Owner
  ownerId?: string;
  ownerName?: string;
  // Tracking
  lostReason?: string;
  wonReason?: string;
  notes?: string;
  status: 'open' | 'won' | 'lost';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CRMInteraction {
  id: string;
  userId: string;
  clientId: string;
  clientName: string;
  dealId?: string;
  type: InteractionType;
  subject: string;
  description?: string;
  date: string;
  time?: string;
  duration?: number; // minutes
  // Participants
  contactPerson?: string;
  teamMember?: string;
  // Follow up
  nextSteps?: string;
  followUpDate?: string;
  // Outcome
  outcome?: 'positive' | 'neutral' | 'negative';
  status: 'completed' | 'scheduled' | 'cancelled';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CRMNote {
  id: string;
  userId: string;
  clientId: string;
  content: string;
  isPinned?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Input types
export type CRMClientInput = Omit<CRMClient, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type CRMDealInput = Omit<CRMDeal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type CRMInteractionInput = Omit<CRMInteraction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type CRMNoteInput = Omit<CRMNote, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

// ============ ACTIVITY LOG MODULE ============

export type ActivityModule =
  | 'transactions'
  | 'subscriptions'
  | 'contractors'
  | 'team_payroll'
  | 'recruitment'
  | 'crm'
  | 'profit_share'
  | 'settings'
  | 'user_management';

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'submit'
  | 'approve'
  | 'reject'
  | 'complete'
  | 'cancel'
  | 'upload'
  | 'download'
  | 'login'
  | 'logout';

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  module: ActivityModule;
  action: ActivityAction;
  entityType: string; // e.g., 'transaction', 'contractor', 'candidate'
  entityId?: string;
  entityName?: string;
  description: string;
  details?: Record<string, any>; // Additional context (old/new values, etc.)
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  createdAt?: Date;
}

export type ActivityLogInput = Omit<ActivityLog, 'id' | 'createdAt'>;
