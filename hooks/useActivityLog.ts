import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  createActivityLog,
  subscribeToActivityLogs,
  getActivityLogs,
} from '../services/firestoreService';
import type { ActivityLog, ActivityLogInput, ActivityModule, ActivityAction } from '../types';

interface UseActivityLogOptions {
  realtime?: boolean;
  limit?: number;
}

export function useActivityLog(options: UseActivityLogOptions = { realtime: true, limit: 50 }) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getActivityLogs(user.uid, { limitCount: options.limit });
      setActivities(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch activities');
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, options.limit]);

  useEffect(() => {
    if (!user?.uid) {
      setActivities([]);
      setLoading(false);
      return;
    }

    if (options.realtime) {
      setLoading(true);
      const unsubscribe = subscribeToActivityLogs(
        user.uid,
        (data) => {
          setActivities(data);
          setLoading(false);
        },
        options.limit || 50
      );
      return () => unsubscribe();
    } else {
      fetchActivities();
    }
  }, [user?.uid, options.realtime, options.limit, fetchActivities]);

  const logActivity = useCallback(
    async (
      module: ActivityModule,
      action: ActivityAction,
      entityType: string,
      description: string,
      details?: {
        entityId?: string;
        entityName?: string;
        extra?: Record<string, any>;
      }
    ): Promise<string | null> => {
      if (!user?.uid || !user?.email || !user?.name) {
        console.warn('Cannot log activity: user not authenticated');
        return null;
      }

      try {
        const activityData: ActivityLogInput = {
          userId: user.uid,
          userName: user.name,
          userEmail: user.email,
          module,
          action,
          entityType,
          entityId: details?.entityId,
          entityName: details?.entityName,
          description,
          details: details?.extra,
          timestamp: new Date(),
        };

        const id = await createActivityLog(activityData);
        return id;
      } catch (err: any) {
        console.error('Error logging activity:', err);
        return null;
      }
    },
    [user?.uid, user?.email, user?.name]
  );

  // Convenience methods for common actions
  const logCreate = useCallback(
    (module: ActivityModule, entityType: string, entityName: string, entityId?: string) => {
      return logActivity(module, 'create', entityType, `Created ${entityType}: ${entityName}`, {
        entityId,
        entityName,
      });
    },
    [logActivity]
  );

  const logUpdate = useCallback(
    (
      module: ActivityModule,
      entityType: string,
      entityName: string,
      entityId?: string,
      changes?: Record<string, any>
    ) => {
      return logActivity(module, 'update', entityType, `Updated ${entityType}: ${entityName}`, {
        entityId,
        entityName,
        extra: changes ? { changes } : undefined,
      });
    },
    [logActivity]
  );

  const logDelete = useCallback(
    (module: ActivityModule, entityType: string, entityName: string, entityId?: string) => {
      return logActivity(module, 'delete', entityType, `Deleted ${entityType}: ${entityName}`, {
        entityId,
        entityName,
      });
    },
    [logActivity]
  );

  const logSubmit = useCallback(
    (module: ActivityModule, entityType: string, entityName: string, entityId?: string) => {
      return logActivity(module, 'submit', entityType, `Submitted ${entityType}: ${entityName}`, {
        entityId,
        entityName,
      });
    },
    [logActivity]
  );

  const logApprove = useCallback(
    (module: ActivityModule, entityType: string, entityName: string, entityId?: string) => {
      return logActivity(module, 'approve', entityType, `Approved ${entityType}: ${entityName}`, {
        entityId,
        entityName,
      });
    },
    [logActivity]
  );

  return {
    activities,
    loading,
    error,
    refresh: fetchActivities,
    logActivity,
    logCreate,
    logUpdate,
    logDelete,
    logSubmit,
    logApprove,
  };
}

// Helper function to get activity icon based on action
export function getActivityIcon(action: ActivityAction): string {
  switch (action) {
    case 'create':
      return 'plus-circle';
    case 'update':
      return 'edit';
    case 'delete':
      return 'trash-2';
    case 'submit':
      return 'send';
    case 'approve':
      return 'check-circle';
    case 'reject':
      return 'x-circle';
    case 'complete':
      return 'check-square';
    case 'cancel':
      return 'x-square';
    case 'upload':
      return 'upload';
    case 'download':
      return 'download';
    case 'login':
      return 'log-in';
    case 'logout':
      return 'log-out';
    default:
      return 'activity';
  }
}

// Helper function to get activity color based on action
export function getActivityColor(action: ActivityAction): string {
  switch (action) {
    case 'create':
      return 'text-emerald-600 bg-emerald-100';
    case 'update':
      return 'text-blue-600 bg-blue-100';
    case 'delete':
      return 'text-red-600 bg-red-100';
    case 'submit':
      return 'text-purple-600 bg-purple-100';
    case 'approve':
      return 'text-green-600 bg-green-100';
    case 'reject':
      return 'text-red-600 bg-red-100';
    case 'complete':
      return 'text-teal-600 bg-teal-100';
    case 'cancel':
      return 'text-orange-600 bg-orange-100';
    case 'upload':
      return 'text-indigo-600 bg-indigo-100';
    case 'download':
      return 'text-cyan-600 bg-cyan-100';
    case 'login':
      return 'text-slate-600 bg-slate-100';
    case 'logout':
      return 'text-slate-600 bg-slate-100';
    default:
      return 'text-slate-600 bg-slate-100';
  }
}

// Helper function to get module display name
export function getModuleDisplayName(module: ActivityModule): string {
  const names: Record<ActivityModule, string> = {
    transactions: 'Transactions',
    subscriptions: 'Subscriptions',
    contractors: 'Contractors',
    team_payroll: 'Team & Payroll',
    recruitment: 'Recruitment',
    crm: 'CRM',
    profit_share: 'Profit Share',
    settings: 'Settings',
    user_management: 'User Management',
  };
  return names[module] || module;
}
