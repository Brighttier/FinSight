import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getPartners,
  createPartner,
  updatePartner,
  deletePartner,
  subscribeToPartners,
  createDistribution,
  getDistributions,
} from '../services/firestoreService';
import type { Partner, PartnerInput, Distribution } from '../types';
import toast from 'react-hot-toast';

interface UsePartnersOptions {
  realtime?: boolean;
}

export function usePartners(options: UsePartnersOptions = {}) {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPartners = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getPartners(user.uid);
      setPartners(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch partners');
      console.error('Error fetching partners:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const fetchDistributions = useCallback(async () => {
    try {
      const data = await getDistributions();
      setDistributions(data);
    } catch (err: any) {
      console.error('Error fetching distributions:', err);
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setPartners([]);
      setLoading(false);
      return;
    }

    if (options.realtime) {
      setLoading(true);
      const unsubscribe = subscribeToPartners(user.uid, (data) => {
        setPartners(data);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      fetchPartners();
    }

    fetchDistributions();
  }, [user?.uid, options.realtime, fetchPartners, fetchDistributions]);

  const addPartner = async (data: PartnerInput): Promise<string | null> => {
    if (!user?.uid) {
      toast.error('You must be logged in');
      return null;
    }

    // Validate total share percentage
    const currentTotal = partners
      .filter((p) => p.status === 'active')
      .reduce((sum, p) => sum + p.sharePercentage, 0);

    if (currentTotal + data.sharePercentage > 100) {
      toast.error(
        `Cannot add partner. Total share would exceed 100% (currently ${currentTotal}%)`
      );
      return null;
    }

    try {
      const id = await createPartner(user.uid, data);
      toast.success('Partner added');
      if (!options.realtime) {
        await fetchPartners();
      }
      return id;
    } catch (err: any) {
      toast.error(err.message || 'Failed to add partner');
      return null;
    }
  };

  const editPartner = async (
    id: string,
    data: Partial<PartnerInput>
  ): Promise<boolean> => {
    // Validate total share percentage if updating share
    if (data.sharePercentage !== undefined) {
      const partner = partners.find((p) => p.id === id);
      const otherPartnersTotal = partners
        .filter((p) => p.id !== id && p.status === 'active')
        .reduce((sum, p) => sum + p.sharePercentage, 0);

      if (otherPartnersTotal + data.sharePercentage > 100) {
        toast.error(
          `Cannot update share. Total would exceed 100% (others have ${otherPartnersTotal}%)`
        );
        return false;
      }
    }

    try {
      await updatePartner(id, data);
      toast.success('Partner updated');
      if (!options.realtime) {
        await fetchPartners();
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update partner');
      return false;
    }
  };

  const removePartner = async (id: string): Promise<boolean> => {
    try {
      await deletePartner(id);
      toast.success('Partner removed');
      if (!options.realtime) {
        await fetchPartners();
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove partner');
      return false;
    }
  };

  const distributeProfit = async (
    profitAmount: number
  ): Promise<boolean> => {
    const activePartners = partners.filter((p) => p.status === 'active');

    if (activePartners.length === 0) {
      toast.error('No active partners to distribute to');
      return false;
    }

    const totalShare = activePartners.reduce((sum, p) => sum + p.sharePercentage, 0);
    if (totalShare !== 100) {
      toast.error(`Partner shares must total 100% (currently ${totalShare}%)`);
      return false;
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      // Create distribution records for each partner
      const distributionPromises = activePartners.map((partner) => {
        const amount = (profitAmount * partner.sharePercentage) / 100;
        return createDistribution({
          partnerId: partner.id,
          partnerName: partner.name,
          amount,
          date: today,
          status: 'pending',
        });
      });

      await Promise.all(distributionPromises);
      toast.success('Profit distribution recorded');
      await fetchDistributions();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to distribute profit');
      return false;
    }
  };

  // Calculate metrics
  const metrics = {
    totalPartners: partners.length,
    activePartners: partners.filter((p) => p.status === 'active').length,
    totalShareAllocated: partners
      .filter((p) => p.status === 'active')
      .reduce((sum, p) => sum + p.sharePercentage, 0),
    remainingShare:
      100 -
      partners
        .filter((p) => p.status === 'active')
        .reduce((sum, p) => sum + p.sharePercentage, 0),
    totalDistributed: distributions
      .filter((d) => d.status === 'completed')
      .reduce((sum, d) => sum + d.amount, 0),
    pendingDistributions: distributions
      .filter((d) => d.status === 'pending')
      .reduce((sum, d) => sum + d.amount, 0),
  };

  return {
    partners,
    distributions,
    loading,
    error,
    metrics,
    refresh: fetchPartners,
    addPartner,
    editPartner,
    removePartner,
    distributeProfit,
  };
}
