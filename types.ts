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

// Form input types (for creating/updating)
export type TransactionInput = Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type SubscriptionInput = Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type PartnerInput = Omit<Partner, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type CustomerInput = Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type ContractorInput = Omit<Contractor, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type ContractorAssignmentInput = Omit<ContractorAssignment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type ContractorTimesheetInput = Omit<ContractorTimesheet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
