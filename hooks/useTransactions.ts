import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  subscribeToTransactions,
} from '../services/firestoreService';
import type { Transaction, TransactionInput, ChartDataPoint } from '../types';
import toast from 'react-hot-toast';

interface UseTransactionsOptions {
  type?: 'revenue' | 'expense';
  status?: 'draft' | 'posted';
  startDate?: string;
  endDate?: string;
  realtime?: boolean;
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getTransactions(user.uid, options);
      setTransactions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, options.type, options.status, options.startDate, options.endDate]);

  useEffect(() => {
    if (!user?.uid) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    if (options.realtime) {
      setLoading(true);
      const unsubscribe = subscribeToTransactions(user.uid, (data) => {
        let filtered = data;
        if (options.type) {
          filtered = filtered.filter((t) => t.type === options.type);
        }
        if (options.status) {
          filtered = filtered.filter((t) => t.status === options.status);
        }
        if (options.startDate) {
          filtered = filtered.filter((t) => t.date >= options.startDate!);
        }
        if (options.endDate) {
          filtered = filtered.filter((t) => t.date <= options.endDate!);
        }
        setTransactions(filtered);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      fetchTransactions();
    }
  }, [user?.uid, options.realtime, fetchTransactions]);

  const addTransaction = async (data: TransactionInput): Promise<string | null> => {
    if (!user?.uid) {
      toast.error('You must be logged in');
      return null;
    }

    try {
      const id = await createTransaction(user.uid, data);
      toast.success('Transaction added');
      if (!options.realtime) {
        await fetchTransactions();
      }
      return id;
    } catch (err: any) {
      toast.error(err.message || 'Failed to add transaction');
      return null;
    }
  };

  const editTransaction = async (
    id: string,
    data: Partial<TransactionInput>
  ): Promise<boolean> => {
    try {
      await updateTransaction(id, data);
      toast.success('Transaction updated');
      if (!options.realtime) {
        await fetchTransactions();
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update transaction');
      return false;
    }
  };

  const removeTransaction = async (id: string): Promise<boolean> => {
    try {
      await deleteTransaction(id);
      toast.success('Transaction deleted');
      if (!options.realtime) {
        await fetchTransactions();
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete transaction');
      return false;
    }
  };

  return {
    transactions,
    loading,
    error,
    refresh: fetchTransactions,
    addTransaction,
    editTransaction,
    removeTransaction,
  };
}

// Hook for calculating cash flow data for charts
export function useCashFlow(days: number = 30) {
  const { user } = useAuth();
  const [cashFlow, setCashFlow] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0,
  });

  useEffect(() => {
    if (!user?.uid) {
      setCashFlow([]);
      setLoading(false);
      return;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const fetchData = async () => {
      try {
        setLoading(true);
        const transactions = await getTransactions(user.uid, {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          status: 'posted',
        });

        // Group by date
        const grouped: Record<string, { revenue: number; expenses: number }> = {};

        transactions.forEach((t) => {
          const date = t.date.split('T')[0];
          if (!grouped[date]) {
            grouped[date] = { revenue: 0, expenses: 0 };
          }
          if (t.type === 'revenue') {
            grouped[date].revenue += t.amount;
          } else {
            grouped[date].expenses += t.amount;
          }
        });

        // Convert to chart data points
        const chartData: ChartDataPoint[] = Object.entries(grouped)
          .map(([date, values]) => ({
            date,
            revenue: values.revenue,
            expenses: values.expenses,
            profit: values.revenue - values.expenses,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setCashFlow(chartData);

        // Calculate totals
        const totalRevenue = transactions
          .filter((t) => t.type === 'revenue')
          .reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = transactions
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        setTotals({
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit: totalRevenue - totalExpenses,
        });
      } catch (err) {
        console.error('Error fetching cash flow:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid, days]);

  return { cashFlow, totals, loading };
}

// Hook for P&L calculations
export function usePnL(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  const [pnlData, setPnlData] = useState<{
    revenue: number;
    expenses: number;
    profit: number;
    expensesByCategory: Record<string, number>;
    revenueByCategory: Record<string, number>;
  }>({
    revenue: 0,
    expenses: 0,
    profit: 0,
    expensesByCategory: {},
    revenueByCategory: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const fetchPnL = async () => {
      try {
        setLoading(true);
        const transactions = await getTransactions(user.uid, {
          startDate,
          endDate,
          status: 'posted',
        });

        let revenue = 0;
        let expenses = 0;
        const expensesByCategory: Record<string, number> = {};
        const revenueByCategory: Record<string, number> = {};

        transactions.forEach((t) => {
          if (t.type === 'revenue') {
            revenue += t.amount;
            revenueByCategory[t.category] =
              (revenueByCategory[t.category] || 0) + t.amount;
          } else {
            expenses += t.amount;
            expensesByCategory[t.category] =
              (expensesByCategory[t.category] || 0) + t.amount;
          }
        });

        setPnlData({
          revenue,
          expenses,
          profit: revenue - expenses,
          expensesByCategory,
          revenueByCategory,
        });
      } catch (err) {
        console.error('Error calculating P&L:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPnL();
  }, [user?.uid, startDate, endDate]);

  return { ...pnlData, loading };
}
