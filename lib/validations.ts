import { z } from 'zod';

// Auth validations
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

// Transaction validations
export const transactionSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required').max(200, 'Description must be less than 200 characters'),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['revenue', 'expense'], {
    errorMap: () => ({ message: 'Please select a transaction type' }),
  }),
  category: z.string().min(1, 'Category is required'),
  status: z.enum(['draft', 'posted']).default('posted'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  receiptUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

// Subscription validations
export const subscriptionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  cost: z.number().positive('Cost must be positive'),
  billingCycle: z.enum(['monthly', 'annual'], {
    errorMap: () => ({ message: 'Please select a billing cycle' }),
  }),
  category: z.string().min(1, 'Category is required'),
  nextBillingDate: z.string().min(1, 'Next billing date is required'),
  status: z.enum(['active', 'cancelled', 'paused']).default('active'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  savingsOpportunity: z.number().min(0, 'Savings cannot be negative').optional(),
});

// Partner validations
export const partnerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Please enter a valid email address'),
  sharePercentage: z.number()
    .min(0.01, 'Share must be at least 0.01%')
    .max(100, 'Share cannot exceed 100%'),
  role: z.string().min(1, 'Role is required'),
  status: z.enum(['active', 'inactive']).default('active'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Distribution validations
export const distributionSchema = z.object({
  profitAmount: z.number().positive('Profit amount must be positive'),
});

// User settings validations
export const userSettingsSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
  fiscalYearStart: z.number().min(1).max(12),
  emailNotifications: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
});

// Export types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
export type PartnerInput = z.infer<typeof partnerSchema>;
export type DistributionInput = z.infer<typeof distributionSchema>;
export type UserSettingsInput = z.infer<typeof userSettingsSchema>;
