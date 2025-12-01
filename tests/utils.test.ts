import { describe, it, expect } from 'vitest';

// Test utility functions that can be extracted later
describe('Financial Calculations', () => {
  describe('Profit Margin Calculation', () => {
    const calculateProfitMargin = (revenue: number, expenses: number): number => {
      if (revenue === 0) return 0;
      return ((revenue - expenses) / revenue) * 100;
    };

    it('calculates correct profit margin', () => {
      expect(calculateProfitMargin(100000, 70000)).toBe(30);
    });

    it('handles zero revenue', () => {
      expect(calculateProfitMargin(0, 1000)).toBe(0);
    });

    it('handles negative margin', () => {
      expect(calculateProfitMargin(50000, 75000)).toBe(-50);
    });
  });

  describe('Monthly Breakdown', () => {
    const groupByMonth = (
      transactions: Array<{ date: string; amount: number; type: string }>
    ): Record<string, { revenue: number; expenses: number }> => {
      return transactions.reduce((acc, t) => {
        const month = t.date.slice(0, 7);
        if (!acc[month]) {
          acc[month] = { revenue: 0, expenses: 0 };
        }
        if (t.type === 'revenue') {
          acc[month].revenue += t.amount;
        } else {
          acc[month].expenses += t.amount;
        }
        return acc;
      }, {} as Record<string, { revenue: number; expenses: number }>);
    };

    it('groups transactions by month', () => {
      const transactions = [
        { date: '2024-01-15', amount: 1000, type: 'revenue' },
        { date: '2024-01-20', amount: 500, type: 'expense' },
        { date: '2024-02-01', amount: 2000, type: 'revenue' },
      ];

      const result = groupByMonth(transactions);

      expect(result['2024-01']).toEqual({ revenue: 1000, expenses: 500 });
      expect(result['2024-02']).toEqual({ revenue: 2000, expenses: 0 });
    });

    it('handles empty transactions', () => {
      expect(groupByMonth([])).toEqual({});
    });
  });

  describe('Share Distribution', () => {
    const calculateDistribution = (
      profit: number,
      partners: Array<{ name: string; sharePercentage: number }>
    ): Array<{ name: string; amount: number }> => {
      return partners.map((p) => ({
        name: p.name,
        amount: (profit * p.sharePercentage) / 100,
      }));
    };

    it('calculates correct distribution', () => {
      const partners = [
        { name: 'Alice', sharePercentage: 60 },
        { name: 'Bob', sharePercentage: 40 },
      ];

      const result = calculateDistribution(10000, partners);

      expect(result).toEqual([
        { name: 'Alice', amount: 6000 },
        { name: 'Bob', amount: 4000 },
      ]);
    });

    it('handles decimal percentages', () => {
      const partners = [
        { name: 'Alice', sharePercentage: 33.33 },
        { name: 'Bob', sharePercentage: 66.67 },
      ];

      const result = calculateDistribution(10000, partners);

      expect(result[0].amount).toBeCloseTo(3333);
      expect(result[1].amount).toBeCloseTo(6667);
    });
  });

  describe('Subscription Metrics', () => {
    const calculateMonthlyTotal = (
      subscriptions: Array<{ cost: number; billingCycle: 'monthly' | 'annual'; status: string }>
    ): number => {
      return subscriptions
        .filter((s) => s.status === 'active')
        .reduce((sum, s) => {
          if (s.billingCycle === 'monthly') {
            return sum + s.cost;
          }
          return sum + s.cost / 12;
        }, 0);
    };

    it('calculates monthly total from mixed billing cycles', () => {
      const subscriptions = [
        { cost: 100, billingCycle: 'monthly' as const, status: 'active' },
        { cost: 1200, billingCycle: 'annual' as const, status: 'active' },
        { cost: 50, billingCycle: 'monthly' as const, status: 'cancelled' },
      ];

      expect(calculateMonthlyTotal(subscriptions)).toBe(200); // 100 + (1200/12) = 200
    });

    it('excludes cancelled subscriptions', () => {
      const subscriptions = [
        { cost: 100, billingCycle: 'monthly' as const, status: 'cancelled' },
      ];

      expect(calculateMonthlyTotal(subscriptions)).toBe(0);
    });
  });

  describe('Burn Rate & Runway', () => {
    const calculateRunway = (currentCash: number, monthlyBurnRate: number): number | null => {
      if (monthlyBurnRate <= 0) return null; // Profitable or break-even
      return currentCash / monthlyBurnRate;
    };

    it('calculates runway correctly', () => {
      expect(calculateRunway(100000, 10000)).toBe(10);
    });

    it('handles profitable scenario', () => {
      expect(calculateRunway(100000, 0)).toBe(null);
      expect(calculateRunway(100000, -5000)).toBe(null);
    });
  });
});
