import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getPayments,
  getPaymentsForTransaction,
  getPaymentsForTimesheet,
  createPayment,
  updatePayment,
  deletePayment,
  subscribeToPayments,
  subscribeToPaymentsForTransaction,
  subscribeToPaymentsForTimesheet,
  calculatePaymentSummary,
  PaymentSummary,
} from '../services/paymentService';
import { createActivityLog } from '../services/firestoreService';
import type { Payment, PaymentInput, ActivityLogInput } from '../types';
import toast from 'react-hot-toast';

interface UsePaymentsOptions {
  transactionId?: string;
  timesheetId?: string;
  startDate?: string;
  endDate?: string;
  realtime?: boolean;
}

export function usePayments(options: UsePaymentsOptions = {}) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);

      let data: Payment[];
      if (options.transactionId) {
        data = await getPaymentsForTransaction(user.uid, options.transactionId);
      } else if (options.timesheetId) {
        data = await getPaymentsForTimesheet(user.uid, options.timesheetId);
      } else {
        data = await getPayments(user.uid, {
          startDate: options.startDate,
          endDate: options.endDate,
        });
      }

      setPayments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payments');
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, options.transactionId, options.timesheetId, options.startDate, options.endDate]);

  useEffect(() => {
    if (!user?.uid) {
      setPayments([]);
      setLoading(false);
      return;
    }

    if (options.realtime) {
      setLoading(true);

      let unsubscribe: () => void;

      if (options.transactionId) {
        unsubscribe = subscribeToPaymentsForTransaction(
          user.uid,
          options.transactionId,
          (data) => {
            setPayments(data);
            setLoading(false);
          }
        );
      } else if (options.timesheetId) {
        unsubscribe = subscribeToPaymentsForTimesheet(
          user.uid,
          options.timesheetId,
          (data) => {
            setPayments(data);
            setLoading(false);
          }
        );
      } else {
        unsubscribe = subscribeToPayments(user.uid, (data) => {
          let filtered = data;
          if (options.startDate) {
            filtered = filtered.filter((p) => p.paymentDate >= options.startDate!);
          }
          if (options.endDate) {
            filtered = filtered.filter((p) => p.paymentDate <= options.endDate!);
          }
          setPayments(filtered);
          setLoading(false);
        });
      }

      return () => unsubscribe();
    } else {
      fetchPayments();
    }
  }, [user?.uid, options.realtime, options.transactionId, options.timesheetId, fetchPayments]);

  const addPayment = async (data: PaymentInput): Promise<string | null> => {
    if (!user?.uid || !user?.email || !user?.name) {
      toast.error('You must be logged in');
      return null;
    }

    try {
      const paymentData: PaymentInput = {
        ...data,
        createdBy: user.uid,
      };

      const id = await createPayment(user.uid, paymentData);
      toast.success('Payment recorded');

      // Log activity
      const activityData: ActivityLogInput = {
        userId: user.uid,
        userName: user.name,
        userEmail: user.email,
        module: 'transactions',
        action: 'create',
        entityType: 'payment',
        entityId: id,
        description: `Recorded payment of $${data.amount.toFixed(2)}${data.transactionId ? ' for transaction' : data.timesheetId ? ' for timesheet' : ''}`,
        details: {
          amount: data.amount,
          paymentDate: data.paymentDate,
          paymentMethod: data.paymentMethod,
          transactionId: data.transactionId,
          timesheetId: data.timesheetId,
        },
        timestamp: new Date(),
      };
      createActivityLog(activityData).catch(console.error);

      if (!options.realtime) {
        await fetchPayments();
      }
      return id;
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
      return null;
    }
  };

  const editPayment = async (
    id: string,
    data: Partial<PaymentInput>
  ): Promise<boolean> => {
    if (!user?.uid || !user?.email || !user?.name) {
      toast.error('You must be logged in');
      return false;
    }

    try {
      await updatePayment(id, data);
      toast.success('Payment updated');

      // Log activity
      const activityData: ActivityLogInput = {
        userId: user.uid,
        userName: user.name,
        userEmail: user.email,
        module: 'transactions',
        action: 'update',
        entityType: 'payment',
        entityId: id,
        description: `Updated payment${data.amount ? ` to $${data.amount.toFixed(2)}` : ''}`,
        details: data,
        timestamp: new Date(),
      };
      createActivityLog(activityData).catch(console.error);

      if (!options.realtime) {
        await fetchPayments();
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payment');
      return false;
    }
  };

  const removePayment = async (id: string, amount?: number): Promise<boolean> => {
    if (!user?.uid || !user?.email || !user?.name) {
      toast.error('You must be logged in');
      return false;
    }

    try {
      await deletePayment(id);
      toast.success('Payment deleted');

      // Log activity
      const activityData: ActivityLogInput = {
        userId: user.uid,
        userName: user.name,
        userEmail: user.email,
        module: 'transactions',
        action: 'delete',
        entityType: 'payment',
        entityId: id,
        description: `Deleted payment${amount ? ` of $${amount.toFixed(2)}` : ''}`,
        timestamp: new Date(),
      };
      createActivityLog(activityData).catch(console.error);

      if (!options.realtime) {
        await fetchPayments();
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete payment');
      return false;
    }
  };

  // Calculate summary for a given total amount
  const getPaymentSummary = (totalAmount: number): PaymentSummary => {
    return calculatePaymentSummary(totalAmount, payments);
  };

  return {
    payments,
    loading,
    error,
    refresh: fetchPayments,
    addPayment,
    editPayment,
    removePayment,
    getPaymentSummary,
  };
}

// Hook specifically for getting payment summary for a transaction/timesheet
export function usePaymentSummary(
  entityType: 'transaction' | 'timesheet',
  entityId: string,
  totalAmount: number,
  realtime: boolean = true
) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PaymentSummary>({
    totalPaid: 0,
    remainingBalance: totalAmount,
    paymentStatus: 'unpaid',
    paymentCount: 0,
  });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !entityId) {
      setSummary({
        totalPaid: 0,
        remainingBalance: totalAmount,
        paymentStatus: 'unpaid',
        paymentCount: 0,
      });
      setPayments([]);
      setLoading(false);
      return;
    }

    if (realtime) {
      setLoading(true);

      const subscribeFunc =
        entityType === 'transaction'
          ? subscribeToPaymentsForTransaction
          : subscribeToPaymentsForTimesheet;

      const unsubscribe = subscribeFunc(user.uid, entityId, (data) => {
        setPayments(data);
        setSummary(calculatePaymentSummary(totalAmount, data));
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      const fetchFunc =
        entityType === 'transaction'
          ? getPaymentsForTransaction
          : getPaymentsForTimesheet;

      setLoading(true);
      fetchFunc(user.uid, entityId)
        .then((data) => {
          setPayments(data);
          setSummary(calculatePaymentSummary(totalAmount, data));
        })
        .catch((err) => {
          console.error('Error fetching payment summary:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user?.uid, entityType, entityId, totalAmount, realtime]);

  return { summary, payments, loading };
}
