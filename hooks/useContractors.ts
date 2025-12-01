import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  subscribeToCustomers,
  getContractors,
  createContractor,
  updateContractor,
  deleteContractor,
  subscribeToContractors,
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  subscribeToAssignments,
  getTimesheets,
  createTimesheet,
  updateTimesheet,
  deleteTimesheet,
  subscribeToTimesheets,
} from '../services/firestoreService';
import { getExchangeRate, convertToUSD } from '../services/currencyService';
import type {
  Customer,
  CustomerInput,
  Contractor,
  ContractorInput,
  ContractorAssignment,
  ContractorAssignmentInput,
  ContractorTimesheet,
  ContractorTimesheetInput,
  CurrencyCode,
} from '../types';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear } from 'date-fns';

interface UseContractorsOptions {
  realtime?: boolean;
}

interface ContractorMetrics {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  activeContractors: number;
  activeCustomers: number;
  activeAssignments: number;
}

interface ByContractorMetrics {
  contractorId: string;
  contractorName: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  daysWorked: number;
}

interface ByCustomerMetrics {
  customerId: string;
  customerName: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  contractorCount: number;
}

export function useContractors(options: UseContractorsOptions = {}) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [assignments, setAssignments] = useState<ContractorAssignment[]>([]);
  const [timesheets, setTimesheets] = useState<ContractorTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      const [customersData, contractorsData, assignmentsData, timesheetsData] = await Promise.all([
        getCustomers(user.uid),
        getContractors(user.uid),
        getAssignments(user.uid),
        getTimesheets(user.uid),
      ]);
      setCustomers(customersData);
      setContractors(contractorsData);
      setAssignments(assignmentsData);
      setTimesheets(timesheetsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch contractor data');
      console.error('Error fetching contractor data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setCustomers([]);
      setContractors([]);
      setAssignments([]);
      setTimesheets([]);
      setLoading(false);
      return;
    }

    if (options.realtime) {
      setLoading(true);
      setError(null);

      const unsubscribers: (() => void)[] = [];
      let loadedCount = 0;
      const totalCollections = 4;

      const checkLoadingComplete = () => {
        loadedCount++;
        if (loadedCount >= totalCollections) {
          setLoading(false);
        }
      };

      try {
        // Set up subscriptions with error handling
        const unsubCustomers = subscribeToCustomers(user.uid, (data) => {
          setCustomers(data);
          checkLoadingComplete();
        });
        unsubscribers.push(unsubCustomers);

        const unsubContractors = subscribeToContractors(user.uid, (data) => {
          setContractors(data);
          checkLoadingComplete();
        });
        unsubscribers.push(unsubContractors);

        const unsubAssignments = subscribeToAssignments(user.uid, (data) => {
          setAssignments(data);
          checkLoadingComplete();
        });
        unsubscribers.push(unsubAssignments);

        const unsubTimesheets = subscribeToTimesheets(user.uid, (data) => {
          setTimesheets(data);
          checkLoadingComplete();
        });
        unsubscribers.push(unsubTimesheets);
      } catch (err: any) {
        console.error('Error setting up subscriptions:', err);
        setError(err.message || 'Failed to subscribe to data');
        setLoading(false);
        // Fallback to non-realtime fetch
        fetchAll();
      }

      return () => {
        unsubscribers.forEach((unsub) => {
          try {
            unsub();
          } catch (e) {
            // Ignore cleanup errors
          }
        });
      };
    } else {
      fetchAll();
    }
  }, [user?.uid, options.realtime, fetchAll]);

  // ============ CUSTOMER CRUD ============
  const addCustomer = async (data: CustomerInput): Promise<string | null> => {
    if (!user?.uid) {
      toast.error('You must be logged in');
      return null;
    }
    try {
      const id = await createCustomer(user.uid, data);
      toast.success('Customer added');
      if (!options.realtime) await fetchAll();
      return id;
    } catch (err: any) {
      toast.error(err.message || 'Failed to add customer');
      return null;
    }
  };

  const editCustomer = async (id: string, data: Partial<CustomerInput>): Promise<boolean> => {
    try {
      await updateCustomer(id, data);
      toast.success('Customer updated');
      if (!options.realtime) await fetchAll();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update customer');
      return false;
    }
  };

  const removeCustomer = async (id: string): Promise<boolean> => {
    // Check if customer has assignments
    const hasAssignments = assignments.some((a) => a.customerId === id);
    if (hasAssignments) {
      toast.error('Cannot delete customer with active assignments');
      return false;
    }
    try {
      await deleteCustomer(id);
      toast.success('Customer deleted');
      if (!options.realtime) await fetchAll();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete customer');
      return false;
    }
  };

  // ============ CONTRACTOR CRUD ============
  const addContractor = async (data: ContractorInput): Promise<string | null> => {
    if (!user?.uid) {
      toast.error('You must be logged in');
      return null;
    }
    try {
      const id = await createContractor(user.uid, data);
      toast.success('Contractor added');
      if (!options.realtime) await fetchAll();
      return id;
    } catch (err: any) {
      toast.error(err.message || 'Failed to add contractor');
      return null;
    }
  };

  const editContractor = async (id: string, data: Partial<ContractorInput>): Promise<boolean> => {
    try {
      await updateContractor(id, data);
      toast.success('Contractor updated');
      if (!options.realtime) await fetchAll();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update contractor');
      return false;
    }
  };

  const removeContractor = async (id: string): Promise<boolean> => {
    const hasAssignments = assignments.some((a) => a.contractorId === id);
    if (hasAssignments) {
      toast.error('Cannot delete contractor with active assignments');
      return false;
    }
    try {
      await deleteContractor(id);
      toast.success('Contractor deleted');
      if (!options.realtime) await fetchAll();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete contractor');
      return false;
    }
  };

  // ============ ASSIGNMENT CRUD ============
  const addAssignment = async (data: Omit<ContractorAssignmentInput, 'contractorName' | 'customerName'>): Promise<string | null> => {
    if (!user?.uid) {
      toast.error('You must be logged in');
      return null;
    }
    const contractor = contractors.find((c) => c.id === data.contractorId);
    const customer = customers.find((c) => c.id === data.customerId);
    if (!contractor || !customer) {
      toast.error('Invalid contractor or customer');
      return null;
    }
    try {
      const fullData: ContractorAssignmentInput = {
        ...data,
        contractorName: contractor.name,
        customerName: customer.name,
      };
      const id = await createAssignment(user.uid, fullData);
      toast.success('Assignment created');
      if (!options.realtime) await fetchAll();
      return id;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create assignment');
      return null;
    }
  };

  const editAssignment = async (id: string, data: Partial<ContractorAssignmentInput>): Promise<boolean> => {
    try {
      await updateAssignment(id, data);
      toast.success('Assignment updated');
      if (!options.realtime) await fetchAll();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update assignment');
      return false;
    }
  };

  const removeAssignment = async (id: string): Promise<boolean> => {
    const hasTimesheets = timesheets.some((t) => t.assignmentId === id);
    if (hasTimesheets) {
      toast.error('Cannot delete assignment with timesheet entries');
      return false;
    }
    try {
      await deleteAssignment(id);
      toast.success('Assignment deleted');
      if (!options.realtime) await fetchAll();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete assignment');
      return false;
    }
  };

  // ============ TIMESHEET CRUD ============
  const addTimesheet = async (data: Omit<ContractorTimesheetInput, 'contractorName' | 'customerName' | 'totalDaysWorked' | 'internalCost' | 'internalCostUSD' | 'externalRevenue' | 'profit' | 'internalCurrency' | 'externalCurrency' | 'internalDayRateUSD' | 'exchangeRate'>): Promise<string | null> => {
    if (!user?.uid) {
      toast.error('You must be logged in');
      return null;
    }

    const assignment = assignments.find((a) => a.id === data.assignmentId);
    if (!assignment) {
      toast.error('Invalid assignment');
      return null;
    }

    // Get currency info from assignment (default to USD for backward compatibility)
    const internalCurrency = assignment.internalCurrency || 'USD';
    const externalCurrency = assignment.externalCurrency || 'USD';
    const exchangeRate = getExchangeRate(internalCurrency);

    // Calculate totals
    const totalDaysWorked = data.standardDaysWorked + data.overtimeDays + (data.overtimeHours / (assignment.standardHoursPerDay || 8));

    // Internal cost in original currency
    const internalCost = totalDaysWorked * data.internalDayRate;
    // Convert internal cost to USD for profit calculation
    const internalDayRateUSD = convertToUSD(data.internalDayRate, internalCurrency);
    const internalCostUSD = totalDaysWorked * internalDayRateUSD;

    // External revenue (already in USD typically)
    const externalRevenue = totalDaysWorked * data.externalDayRate;

    // Profit in USD
    const profit = externalRevenue - internalCostUSD;

    try {
      const fullData: ContractorTimesheetInput = {
        ...data,
        contractorName: assignment.contractorName,
        customerName: assignment.customerName,
        internalCurrency,
        externalCurrency,
        internalDayRateUSD,
        exchangeRate,
        totalDaysWorked,
        internalCost,
        internalCostUSD,
        externalRevenue,
        profit,
      };
      const id = await createTimesheet(user.uid, fullData);
      toast.success('Timesheet entry added');
      if (!options.realtime) await fetchAll();
      return id;
    } catch (err: any) {
      toast.error(err.message || 'Failed to add timesheet');
      return null;
    }
  };

  const editTimesheet = async (id: string, data: Partial<ContractorTimesheetInput>): Promise<boolean> => {
    try {
      // If days/rates changed, recalculate
      const existing = timesheets.find((t) => t.id === id);
      if (existing) {
        const standardDays = data.standardDaysWorked ?? existing.standardDaysWorked;
        const otDays = data.overtimeDays ?? existing.overtimeDays;
        const otHours = data.overtimeHours ?? existing.overtimeHours;
        const intRate = data.internalDayRate ?? existing.internalDayRate;
        const extRate = data.externalDayRate ?? existing.externalDayRate;

        const assignment = assignments.find((a) => a.id === existing.assignmentId);
        const hoursPerDay = assignment?.standardHoursPerDay || 8;

        // Get currency info (with backward compatibility)
        const internalCurrency = existing.internalCurrency || assignment?.internalCurrency || 'USD';
        const exchangeRate = getExchangeRate(internalCurrency);

        const totalDaysWorked = standardDays + otDays + (otHours / hoursPerDay);

        // Internal cost in original currency
        const internalCost = totalDaysWorked * intRate;
        // Convert to USD
        const internalDayRateUSD = convertToUSD(intRate, internalCurrency);
        const internalCostUSD = totalDaysWorked * internalDayRateUSD;

        // External revenue (in USD)
        const externalRevenue = totalDaysWorked * extRate;

        // Profit in USD
        const profit = externalRevenue - internalCostUSD;

        data = {
          ...data,
          totalDaysWorked,
          internalCost,
          internalCostUSD,
          internalDayRateUSD,
          exchangeRate,
          externalRevenue,
          profit,
        };
      }

      await updateTimesheet(id, data);
      toast.success('Timesheet updated');
      if (!options.realtime) await fetchAll();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update timesheet');
      return false;
    }
  };

  const removeTimesheet = async (id: string): Promise<boolean> => {
    try {
      await deleteTimesheet(id);
      toast.success('Timesheet deleted');
      if (!options.realtime) await fetchAll();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete timesheet');
      return false;
    }
  };

  // ============ GENERATE TIMESHEETS FROM ACTIVE ASSIGNMENTS ============
  const generateTimesheetsForMonth = async (month: string): Promise<number> => {
    if (!user?.uid) return 0;

    const activeAssignments = assignments.filter((a) => {
      if (a.status !== 'active') return false;
      const monthStart = `${month}-01`;
      const monthEnd = `${month}-31`;
      if (a.startDate > monthEnd) return false;
      if (a.endDate && a.endDate < monthStart) return false;
      return true;
    });

    // Check which assignments already have timesheets for this month
    const existingForMonth = timesheets.filter((t) => t.month === month);
    const existingAssignmentIds = new Set(existingForMonth.map((t) => t.assignmentId));

    let created = 0;
    for (const assignment of activeAssignments) {
      if (existingAssignmentIds.has(assignment.id)) continue;

      const timesheetData: Omit<ContractorTimesheetInput, 'contractorName' | 'customerName' | 'totalDaysWorked' | 'internalCost' | 'externalRevenue' | 'profit'> = {
        assignmentId: assignment.id,
        contractorId: assignment.contractorId,
        customerId: assignment.customerId,
        month,
        standardDaysWorked: assignment.standardDaysPerMonth || 20,
        overtimeDays: 0,
        overtimeHours: 0,
        internalDayRate: assignment.internalDayRate,
        externalDayRate: assignment.externalDayRate,
        status: 'draft',
      };

      await addTimesheet(timesheetData);
      created++;
    }

    if (created > 0) {
      toast.success(`Generated ${created} timesheet(s) for ${month}`);
    } else {
      toast.info('No new timesheets to generate');
    }

    return created;
  };

  // ============ METRICS CALCULATION ============
  const calculateMetrics = useCallback(
    (filterMonth?: string, filterQuarter?: string, filterYear?: string): ContractorMetrics => {
      let filteredTimesheets = timesheets;

      if (filterMonth) {
        filteredTimesheets = filteredTimesheets.filter((t) => t.month === filterMonth);
      } else if (filterQuarter && filterYear) {
        const quarterStart = filterQuarter === 'Q1' ? '01' : filterQuarter === 'Q2' ? '04' : filterQuarter === 'Q3' ? '07' : '10';
        const quarterEnd = filterQuarter === 'Q1' ? '03' : filterQuarter === 'Q2' ? '06' : filterQuarter === 'Q3' ? '09' : '12';
        filteredTimesheets = filteredTimesheets.filter((t) => {
          const [year, month] = t.month.split('-');
          return year === filterYear && month >= quarterStart && month <= quarterEnd;
        });
      } else if (filterYear) {
        filteredTimesheets = filteredTimesheets.filter((t) => t.month.startsWith(filterYear));
      }

      // All calculations in USD
      const totalRevenue = filteredTimesheets.reduce((sum, t) => sum + t.externalRevenue, 0);
      // Use internalCostUSD if available (new format), otherwise fall back to internalCost (old format, assumed USD)
      const totalCost = filteredTimesheets.reduce((sum, t) => sum + (t.internalCostUSD ?? t.internalCost), 0);
      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      const activeContractors = contractors.filter((c) => c.status === 'active').length;
      const activeCustomers = customers.filter((c) => c.status === 'active').length;
      const activeAssignments = assignments.filter((a) => a.status === 'active').length;

      return {
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin,
        activeContractors,
        activeCustomers,
        activeAssignments,
      };
    },
    [timesheets, contractors, customers, assignments]
  );

  const getMetricsByContractor = useCallback(
    (filterMonth?: string): ByContractorMetrics[] => {
      let filteredTimesheets = timesheets;
      if (filterMonth) {
        filteredTimesheets = filteredTimesheets.filter((t) => t.month === filterMonth);
      }

      const byContractor = new Map<string, ByContractorMetrics>();

      for (const t of filteredTimesheets) {
        const existing = byContractor.get(t.contractorId) || {
          contractorId: t.contractorId,
          contractorName: t.contractorName,
          revenue: 0,
          cost: 0,
          profit: 0,
          margin: 0,
          daysWorked: 0,
        };
        existing.revenue += t.externalRevenue;
        // Use USD cost for consistent metrics
        existing.cost += t.internalCostUSD ?? t.internalCost;
        existing.profit += t.profit;
        existing.daysWorked += t.totalDaysWorked;
        byContractor.set(t.contractorId, existing);
      }

      return Array.from(byContractor.values()).map((m) => ({
        ...m,
        margin: m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0,
      }));
    },
    [timesheets]
  );

  const getMetricsByCustomer = useCallback(
    (filterMonth?: string): ByCustomerMetrics[] => {
      let filteredTimesheets = timesheets;
      if (filterMonth) {
        filteredTimesheets = filteredTimesheets.filter((t) => t.month === filterMonth);
      }

      const byCustomer = new Map<string, ByCustomerMetrics & { contractorIds: Set<string> }>();

      for (const t of filteredTimesheets) {
        const existing = byCustomer.get(t.customerId) || {
          customerId: t.customerId,
          customerName: t.customerName,
          revenue: 0,
          cost: 0,
          profit: 0,
          margin: 0,
          contractorCount: 0,
          contractorIds: new Set<string>(),
        };
        existing.revenue += t.externalRevenue;
        // Use USD cost for consistent metrics
        existing.cost += t.internalCostUSD ?? t.internalCost;
        existing.profit += t.profit;
        existing.contractorIds.add(t.contractorId);
        byCustomer.set(t.customerId, existing);
      }

      return Array.from(byCustomer.values()).map((m) => ({
        customerId: m.customerId,
        customerName: m.customerName,
        revenue: m.revenue,
        cost: m.cost,
        profit: m.profit,
        margin: m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0,
        contractorCount: m.contractorIds.size,
      }));
    },
    [timesheets]
  );

  // ============ FORECAST PROJECTION ============
  const projectFutureRevenue = useCallback(
    (months: number = 6): { month: string; projectedRevenue: number; projectedCost: number; projectedProfit: number }[] => {
      const activeAssigns = assignments.filter((a) => a.status === 'active');
      const projections: { month: string; projectedRevenue: number; projectedCost: number; projectedProfit: number }[] = [];

      const now = new Date();
      for (let i = 1; i <= months; i++) {
        const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthStr = format(futureDate, 'yyyy-MM');

        let projectedRevenue = 0;
        let projectedCost = 0;

        for (const a of activeAssigns) {
          // Check if assignment is active for this month
          const monthStart = `${monthStr}-01`;
          if (a.endDate && a.endDate < monthStart) continue;
          if (a.startDate > `${monthStr}-31`) continue;

          const days = a.standardDaysPerMonth || 20;
          projectedRevenue += days * a.externalDayRate;
          // Use internalDayRateUSD if available, otherwise convert
          const internalCurrency = a.internalCurrency || 'USD';
          const costPerDayUSD = a.internalDayRateUSD ?? convertToUSD(a.internalDayRate, internalCurrency);
          projectedCost += days * costPerDayUSD;
        }

        projections.push({
          month: monthStr,
          projectedRevenue,
          projectedCost,
          projectedProfit: projectedRevenue - projectedCost,
        });
      }

      return projections;
    },
    [assignments]
  );

  // ============ EXPIRING CONTRACTS ============
  const getExpiringContracts = useCallback(
    (daysThreshold: number = 30): { assignment: ContractorAssignment; daysLeft: number }[] => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thresholdDate = new Date(today);
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

      return assignments
        .filter((a) => {
          if (a.status !== 'active' || !a.endDate) return false;
          const endDate = new Date(a.endDate);
          endDate.setHours(0, 0, 0, 0);
          return endDate >= today && endDate <= thresholdDate;
        })
        .map((a) => {
          const endDate = new Date(a.endDate!);
          endDate.setHours(0, 0, 0, 0);
          const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return { assignment: a, daysLeft };
        })
        .sort((a, b) => a.daysLeft - b.daysLeft);
    },
    [assignments]
  );

  return {
    // Data
    customers,
    contractors,
    assignments,
    timesheets,
    loading,
    error,

    // Customer CRUD
    addCustomer,
    editCustomer,
    removeCustomer,

    // Contractor CRUD
    addContractor,
    editContractor,
    removeContractor,

    // Assignment CRUD
    addAssignment,
    editAssignment,
    removeAssignment,

    // Timesheet CRUD
    addTimesheet,
    editTimesheet,
    removeTimesheet,
    generateTimesheetsForMonth,

    // Metrics
    calculateMetrics,
    getMetricsByContractor,
    getMetricsByCustomer,
    projectFutureRevenue,
    getExpiringContracts,

    // Refresh
    refresh: fetchAll,
  };
}
