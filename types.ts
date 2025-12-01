import React from 'react';

export type UserRole = 'director' | 'employee' | 'contractor';

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

// Form input types (for creating/updating)
export type TransactionInput = Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type SubscriptionInput = Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type PartnerInput = Omit<Partner, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
