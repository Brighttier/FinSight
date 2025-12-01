import { ChartDataPoint, Transaction, Subscription } from '../types';

export const MOCK_CASH_FLOW: ChartDataPoint[] = [
  { date: 'Jan 1', revenue: 4000, expenses: 2400, profit: 1600 },
  { date: 'Jan 5', revenue: 3000, expenses: 1398, profit: 1602 },
  { date: 'Jan 10', revenue: 2000, expenses: 9800, profit: -7800 },
  { date: 'Jan 15', revenue: 2780, expenses: 3908, profit: -1128 },
  { date: 'Jan 20', revenue: 1890, expenses: 4800, profit: -2910 },
  { date: 'Jan 25', revenue: 2390, expenses: 3800, profit: -1410 },
  { date: 'Jan 30', revenue: 3490, expenses: 4300, profit: -810 },
  { date: 'Feb 1', revenue: 4200, expenses: 2100, profit: 2100 },
  { date: 'Feb 5', revenue: 5100, expenses: 2300, profit: 2800 },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2025-01-15', description: 'Stripe Payout', category: 'Product Sales', amount: 12500, type: 'revenue', status: 'posted' },
  { id: '2', date: '2025-01-14', description: 'AWS Services', category: 'Infrastructure', amount: 1240, type: 'expense', status: 'posted' },
  { id: '3', date: '2025-01-12', description: 'Upwork Escrow', category: 'Contractors', amount: 850, type: 'expense', status: 'posted' },
  { id: '4', date: '2025-01-10', description: 'Consulting Client A', category: 'Services', amount: 4350, type: 'revenue', status: 'posted' },
  { id: '5', date: '2025-01-08', description: 'Adobe Creative Cloud', category: 'SaaS', amount: 52, type: 'expense', status: 'posted' },
];

export const MOCK_SUBSCRIPTIONS: Subscription[] = [
  { id: '1', vendor: 'Adobe Creative Cloud', cost: 52, billingCycle: 'monthly', nextBillingDate: '2025-02-15', status: 'active' },
  { id: '2', vendor: 'AWS', cost: 1240, billingCycle: 'monthly', nextBillingDate: '2025-02-20', status: 'active', savingsOpportunity: 150 },
  { id: '3', vendor: 'Notion', cost: 10, billingCycle: 'monthly', nextBillingDate: '2025-02-01', status: 'duplicate', savingsOpportunity: 120 },
  { id: '4', vendor: 'Figma', cost: 45, billingCycle: 'monthly', nextBillingDate: '2025-02-05', status: 'active' },
  { id: '5', vendor: 'Slack', cost: 300, billingCycle: 'annual', nextBillingDate: '2025-06-15', status: 'active' },
];