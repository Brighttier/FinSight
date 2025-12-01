import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  transactionSchema,
  subscriptionSchema,
  partnerSchema,
} from '../lib/validations';

describe('Login Schema', () => {
  it('validates correct login credentials', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'invalid-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '12345',
    });
    expect(result.success).toBe(false);
  });
});

describe('Register Schema', () => {
  it('validates correct registration data', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      confirmPassword: 'different123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short name', () => {
    const result = registerSchema.safeParse({
      name: 'J',
      email: 'john@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.success).toBe(false);
  });
});

describe('Transaction Schema', () => {
  it('validates correct transaction data', () => {
    const result = transactionSchema.safeParse({
      date: '2024-01-15',
      description: 'Office supplies',
      amount: 150.50,
      type: 'expense',
      category: 'Office',
      status: 'posted',
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative amount', () => {
    const result = transactionSchema.safeParse({
      date: '2024-01-15',
      description: 'Office supplies',
      amount: -50,
      type: 'expense',
      category: 'Office',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid type', () => {
    const result = transactionSchema.safeParse({
      date: '2024-01-15',
      description: 'Office supplies',
      amount: 150,
      type: 'invalid',
      category: 'Office',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty description', () => {
    const result = transactionSchema.safeParse({
      date: '2024-01-15',
      description: '',
      amount: 150,
      type: 'expense',
      category: 'Office',
    });
    expect(result.success).toBe(false);
  });
});

describe('Subscription Schema', () => {
  it('validates correct subscription data', () => {
    const result = subscriptionSchema.safeParse({
      name: 'AWS',
      cost: 500,
      billingCycle: 'monthly',
      category: 'Infrastructure',
      nextBillingDate: '2024-02-01',
      status: 'active',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid billing cycle', () => {
    const result = subscriptionSchema.safeParse({
      name: 'AWS',
      cost: 500,
      billingCycle: 'weekly',
      category: 'Infrastructure',
      nextBillingDate: '2024-02-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative cost', () => {
    const result = subscriptionSchema.safeParse({
      name: 'AWS',
      cost: -100,
      billingCycle: 'monthly',
      category: 'Infrastructure',
      nextBillingDate: '2024-02-01',
    });
    expect(result.success).toBe(false);
  });
});

describe('Partner Schema', () => {
  it('validates correct partner data', () => {
    const result = partnerSchema.safeParse({
      name: 'Alice Johnson',
      email: 'alice@company.com',
      sharePercentage: 25,
      role: 'Director',
      status: 'active',
    });
    expect(result.success).toBe(true);
  });

  it('rejects share percentage over 100', () => {
    const result = partnerSchema.safeParse({
      name: 'Alice Johnson',
      email: 'alice@company.com',
      sharePercentage: 150,
      role: 'Director',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = partnerSchema.safeParse({
      name: 'Alice Johnson',
      email: 'not-an-email',
      sharePercentage: 25,
      role: 'Director',
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero share percentage', () => {
    const result = partnerSchema.safeParse({
      name: 'Alice Johnson',
      email: 'alice@company.com',
      sharePercentage: 0,
      role: 'Director',
    });
    expect(result.success).toBe(false);
  });
});
