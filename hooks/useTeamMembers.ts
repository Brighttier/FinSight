import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  subscribeToTeamMembers,
  getPayrollRecords,
  createPayrollRecord,
  updatePayrollRecord,
  deletePayrollRecord,
  subscribeToPayrollRecords,
} from '../services/firestoreService';
import type { TeamMember, TeamMemberInput, PayrollRecord, PayrollRecordInput } from '../types';
import toast from 'react-hot-toast';

interface UseTeamMembersOptions {
  realtime?: boolean;
}

export function useTeamMembers(options: UseTeamMembersOptions = {}) {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamMembers = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getTeamMembers(user.uid);
      setTeamMembers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch team members');
      console.error('Error fetching team members:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const fetchPayrollRecords = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const data = await getPayrollRecords(user.uid);
      setPayrollRecords(data);
    } catch (err: any) {
      console.error('Error fetching payroll records:', err);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setTeamMembers([]);
      setPayrollRecords([]);
      setLoading(false);
      return;
    }

    if (options.realtime) {
      setLoading(true);
      const unsubMembers = subscribeToTeamMembers(user.uid, (data) => {
        setTeamMembers(data);
        setLoading(false);
      });
      const unsubPayroll = subscribeToPayrollRecords(user.uid, (data) => {
        setPayrollRecords(data);
      });
      return () => {
        unsubMembers();
        unsubPayroll();
      };
    } else {
      fetchTeamMembers();
      fetchPayrollRecords();
    }
  }, [user?.uid, options.realtime, fetchTeamMembers, fetchPayrollRecords]);

  const addTeamMember = async (data: TeamMemberInput): Promise<string | null> => {
    if (!user?.uid) {
      toast.error('You must be logged in');
      return null;
    }

    try {
      const id = await createTeamMember(user.uid, data);
      toast.success('Team member added');
      if (!options.realtime) {
        await fetchTeamMembers();
      }
      return id;
    } catch (err: any) {
      toast.error(err.message || 'Failed to add team member');
      return null;
    }
  };

  const editTeamMember = async (
    id: string,
    data: Partial<TeamMemberInput>
  ): Promise<boolean> => {
    try {
      await updateTeamMember(id, data);
      toast.success('Team member updated');
      if (!options.realtime) {
        await fetchTeamMembers();
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update team member');
      return false;
    }
  };

  const removeTeamMember = async (id: string): Promise<boolean> => {
    try {
      await deleteTeamMember(id);
      toast.success('Team member removed');
      if (!options.realtime) {
        await fetchTeamMembers();
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove team member');
      return false;
    }
  };

  const addPayrollRecord = async (data: PayrollRecordInput): Promise<string | null> => {
    if (!user?.uid) {
      toast.error('You must be logged in');
      return null;
    }

    try {
      const id = await createPayrollRecord(user.uid, data);
      toast.success('Payroll record added');
      if (!options.realtime) {
        await fetchPayrollRecords();
      }
      return id;
    } catch (err: any) {
      toast.error(err.message || 'Failed to add payroll record');
      return null;
    }
  };

  const editPayrollRecord = async (
    id: string,
    data: Partial<PayrollRecordInput>
  ): Promise<boolean> => {
    try {
      await updatePayrollRecord(id, data);
      toast.success('Payroll record updated');
      if (!options.realtime) {
        await fetchPayrollRecords();
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payroll record');
      return false;
    }
  };

  const removePayrollRecord = async (id: string): Promise<boolean> => {
    try {
      await deletePayrollRecord(id);
      toast.success('Payroll record removed');
      if (!options.realtime) {
        await fetchPayrollRecords();
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove payroll record');
      return false;
    }
  };

  const generateMonthlyPayroll = async (month: string): Promise<boolean> => {
    if (!user?.uid) {
      toast.error('You must be logged in');
      return false;
    }

    const activeMembers = teamMembers.filter((m) => m.status === 'active');
    if (activeMembers.length === 0) {
      toast.error('No active team members');
      return false;
    }

    // Check if payroll already exists for this month
    const existingRecords = payrollRecords.filter((r) => r.month === month);
    if (existingRecords.length > 0) {
      toast.error(`Payroll already exists for ${month}`);
      return false;
    }

    try {
      const promises = activeMembers.map((member) => {
        const record: PayrollRecordInput = {
          teamMemberId: member.id,
          teamMemberName: member.name,
          month,
          baseSalary: member.monthlySalary,
          netAmount: member.monthlySalary,
          currency: member.currency,
          status: 'pending',
        };
        return createPayrollRecord(user.uid, record);
      });

      await Promise.all(promises);
      toast.success(`Generated payroll for ${activeMembers.length} team members`);
      if (!options.realtime) {
        await fetchPayrollRecords();
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate payroll');
      return false;
    }
  };

  const markPayrollPaid = async (recordIds: string[]): Promise<boolean> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const promises = recordIds.map((id) =>
        updatePayrollRecord(id, { status: 'paid', paidDate: today })
      );
      await Promise.all(promises);
      toast.success(`Marked ${recordIds.length} record(s) as paid`);
      if (!options.realtime) {
        await fetchPayrollRecords();
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark payroll as paid');
      return false;
    }
  };

  // Calculate metrics
  const activeMembers = teamMembers.filter((m) => m.status === 'active');
  const metrics = {
    totalMembers: teamMembers.length,
    activeMembers: activeMembers.length,
    monthlyPayroll: activeMembers.reduce((sum, m) => sum + m.monthlySalary, 0),
    annualPayroll: activeMembers.reduce((sum, m) => sum + m.monthlySalary * 12, 0),
    pendingPayroll: payrollRecords
      .filter((r) => r.status === 'pending')
      .reduce((sum, r) => sum + r.netAmount, 0),
    paidThisYear: payrollRecords
      .filter((r) => r.status === 'paid' && r.month.startsWith(new Date().getFullYear().toString()))
      .reduce((sum, r) => sum + r.netAmount, 0),
  };

  return {
    teamMembers,
    payrollRecords,
    loading,
    error,
    metrics,
    refresh: fetchTeamMembers,
    addTeamMember,
    editTeamMember,
    removeTeamMember,
    addPayrollRecord,
    editPayrollRecord,
    removePayrollRecord,
    generateMonthlyPayroll,
    markPayrollPaid,
  };
}
