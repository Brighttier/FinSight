import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getOrganization,
  getAppUserByEmail,
  updateOrganization,
} from '../services/firestoreService';
import type { Organization, OrganizationFinancialsInput } from '../types';
import toast from 'react-hot-toast';

interface UseOrganizationOptions {
  realtime?: boolean;
}

export function useOrganization(options: UseOrganizationOptions = {}) {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = useCallback(async () => {
    if (!user?.uid || !user?.email) {
      setOrganization(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get the app user to find their organization
      const appUser = await getAppUserByEmail(user.email);
      if (!appUser?.organizationId) {
        setOrganization(null);
        setLoading(false);
        return;
      }

      const org = await getOrganization(appUser.organizationId);
      setOrganization(org);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch organization');
      console.error('Error fetching organization:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, user?.email]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  const updateBankBalance = async (amount: number): Promise<boolean> => {
    if (!organization?.id) {
      toast.error('Organization not found');
      return false;
    }

    try {
      await updateOrganization(organization.id, {
        bankBalance: amount,
        lastBankBalanceUpdate: new Date().toISOString().split('T')[0],
      });

      setOrganization((prev) =>
        prev
          ? {
              ...prev,
              bankBalance: amount,
              lastBankBalanceUpdate: new Date().toISOString().split('T')[0],
            }
          : null
      );

      toast.success('Bank balance updated');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update bank balance');
      return false;
    }
  };

  const updateRetentionPercentage = async (percentage: number): Promise<boolean> => {
    if (!organization?.id) {
      toast.error('Organization not found');
      return false;
    }

    if (percentage < 0 || percentage > 100) {
      toast.error('Retention percentage must be between 0 and 100');
      return false;
    }

    try {
      await updateOrganization(organization.id, {
        retentionPercentage: percentage,
      });

      setOrganization((prev) =>
        prev ? { ...prev, retentionPercentage: percentage } : null
      );

      toast.success('Retention percentage updated');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update retention percentage');
      return false;
    }
  };

  const updateFinancials = async (data: OrganizationFinancialsInput): Promise<boolean> => {
    if (!organization?.id) {
      toast.error('Organization not found');
      return false;
    }

    try {
      await updateOrganization(organization.id, data);

      setOrganization((prev) => (prev ? { ...prev, ...data } : null));

      toast.success('Financial settings updated');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update financial settings');
      return false;
    }
  };

  return {
    organization,
    loading,
    error,
    refresh: fetchOrganization,
    updateBankBalance,
    updateRetentionPercentage,
    updateFinancials,
  };
}
