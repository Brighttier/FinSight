import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  subscribeToSubscriptions,
  createActivityLog,
} from '../services/firestoreService';
import type { Subscription, SubscriptionInput, ActivityLogInput } from '../types';
import toast from 'react-hot-toast';

interface UseSubscriptionsOptions {
  status?: 'active' | 'cancelled' | 'paused';
  realtime?: boolean;
}

export function useSubscriptions(options: UseSubscriptionsOptions = {}) {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getSubscriptions(user.uid, options.status);
      setSubscriptions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch subscriptions');
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, options.status]);

  useEffect(() => {
    if (!user?.uid) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    if (options.realtime) {
      setLoading(true);
      const unsubscribe = subscribeToSubscriptions(user.uid, (data) => {
        let filtered = data;
        if (options.status) {
          filtered = filtered.filter((s) => s.status === options.status);
        }
        setSubscriptions(filtered);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      fetchSubscriptions();
    }
  }, [user?.uid, options.realtime, fetchSubscriptions]);

  const addSubscription = async (data: SubscriptionInput): Promise<string | null> => {
    if (!user?.uid || !user?.email || !user?.name) {
      toast.error('You must be logged in');
      return null;
    }

    try {
      const id = await createSubscription(user.uid, data);
      toast.success('Subscription added');

      // Log activity
      const activityData: ActivityLogInput = {
        userId: user.uid,
        userName: user.name,
        userEmail: user.email,
        module: 'subscriptions',
        action: 'create',
        entityType: 'subscription',
        entityId: id,
        entityName: data.vendor,
        description: `Added subscription: ${data.vendor} ($${data.cost}/${data.billingCycle})`,
        timestamp: new Date(),
      };
      createActivityLog(activityData).catch(console.error);

      if (!options.realtime) {
        await fetchSubscriptions();
      }
      return id;
    } catch (err: any) {
      toast.error(err.message || 'Failed to add subscription');
      return null;
    }
  };

  const editSubscription = async (
    id: string,
    data: Partial<SubscriptionInput>
  ): Promise<boolean> => {
    if (!user?.uid || !user?.email || !user?.name) {
      toast.error('You must be logged in');
      return false;
    }

    try {
      await updateSubscription(id, data);
      toast.success('Subscription updated');

      // Log activity
      const activityData: ActivityLogInput = {
        userId: user.uid,
        userName: user.name,
        userEmail: user.email,
        module: 'subscriptions',
        action: 'update',
        entityType: 'subscription',
        entityId: id,
        entityName: data.vendor,
        description: `Updated subscription${data.vendor ? `: ${data.vendor}` : ''}`,
        details: data,
        timestamp: new Date(),
      };
      createActivityLog(activityData).catch(console.error);

      if (!options.realtime) {
        await fetchSubscriptions();
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update subscription');
      return false;
    }
  };

  const removeSubscription = async (id: string, vendor?: string): Promise<boolean> => {
    if (!user?.uid || !user?.email || !user?.name) {
      toast.error('You must be logged in');
      return false;
    }

    try {
      await deleteSubscription(id);
      toast.success('Subscription deleted');

      // Log activity
      const activityData: ActivityLogInput = {
        userId: user.uid,
        userName: user.name,
        userEmail: user.email,
        module: 'subscriptions',
        action: 'delete',
        entityType: 'subscription',
        entityId: id,
        entityName: vendor,
        description: `Deleted subscription${vendor ? `: ${vendor}` : ''}`,
        timestamp: new Date(),
      };
      createActivityLog(activityData).catch(console.error);

      if (!options.realtime) {
        await fetchSubscriptions();
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete subscription');
      return false;
    }
  };

  // Calculate metrics
  const metrics = {
    monthlyTotal: subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => {
        if (s.billingCycle === 'monthly') {
          return sum + s.cost;
        } else {
          return sum + s.cost / 12; // Annual converted to monthly
        }
      }, 0),

    annualTotal: subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => {
        if (s.billingCycle === 'annual') {
          return sum + s.cost;
        } else {
          return sum + s.cost * 12; // Monthly converted to annual
        }
      }, 0),

    activeCount: subscriptions.filter((s) => s.status === 'active').length,

    potentialSavings: subscriptions
      .filter((s) => s.savingsOpportunity && s.savingsOpportunity > 0)
      .reduce((sum, s) => sum + (s.savingsOpportunity || 0), 0),

    upcomingBills: subscriptions
      .filter((s) => {
        if (s.status !== 'active') return false;
        const nextBill = new Date(s.nextBillingDate);
        const now = new Date();
        const daysUntil = Math.ceil(
          (nextBill.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntil <= 7 && daysUntil >= 0;
      })
      .sort(
        (a, b) =>
          new Date(a.nextBillingDate).getTime() -
          new Date(b.nextBillingDate).getTime()
      ),
  };

  return {
    subscriptions,
    loading,
    error,
    metrics,
    refresh: fetchSubscriptions,
    addSubscription,
    editSubscription,
    removeSubscription,
  };
}
