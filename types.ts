import React from 'react';

export type UserRole = 'director' | 'employee' | 'contractor';

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
  | 'reimbursements'
  | 'other';

export interface Transaction {
  id: string;
  userId: string;
  date: string; // ISO String
  description: string;
  category: TransactionCategory;
  amount: number;
  type: 'revenue' | 'expense';
  status: 'draft' | 'posted';
  receiptUrl?: string;
  notes?: string;
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
