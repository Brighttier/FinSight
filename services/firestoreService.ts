import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Transaction,
  TransactionInput,
  Subscription,
  SubscriptionInput,
  Partner,
  PartnerInput,
  Distribution,
  UserSettings,
  Customer,
  CustomerInput,
  Contractor,
  ContractorInput,
  ContractorAssignment,
  ContractorAssignmentInput,
  ContractorTimesheet,
  ContractorTimesheetInput,
  TeamMember,
  TeamMemberInput,
  PayrollRecord,
  PayrollRecordInput,
  RecruitmentClient,
  RecruitmentClientInput,
  JobRole,
  JobRoleInput,
  Recruiter,
  RecruiterInput,
  Candidate,
  CandidateInput,
  CandidateSubmission,
  CandidateSubmissionInput,
  RecruiterTask,
  RecruiterTaskInput,
  CRMClient,
  CRMClientInput,
  CRMDeal,
  CRMDealInput,
  CRMInteraction,
  CRMInteractionInput,
  CRMNote,
  CRMNoteInput,
} from '../types';

// Helper to convert Firestore timestamps to Date
const convertTimestamp = (timestamp: any): Date | undefined => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
};

// Helper to remove undefined values from an object (Firestore rejects undefined)
const removeUndefinedValues = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as Partial<T>;
};

// ============ TRANSACTIONS ============

export async function createTransaction(
  userId: string,
  data: TransactionInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'transactions'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const docSnap = await getDoc(doc(db, 'transactions', id));
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  } as Transaction;
}

export async function getTransactions(
  userId: string,
  options?: {
    type?: 'revenue' | 'expense';
    status?: 'draft' | 'posted';
    startDate?: string;
    endDate?: string;
    limitCount?: number;
  }
): Promise<Transaction[]> {
  const constraints: QueryConstraint[] = [
    where('userId', '==', userId),
    orderBy('date', 'desc'),
  ];

  if (options?.type) {
    constraints.push(where('type', '==', options.type));
  }
  if (options?.status) {
    constraints.push(where('status', '==', options.status));
  }
  if (options?.limitCount) {
    constraints.push(limit(options.limitCount));
  }

  const q = query(collection(db, 'transactions'), ...constraints);
  const snapshot = await getDocs(q);

  let transactions = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as Transaction;
  });

  // Filter by date range in memory (Firestore doesn't support range on different field)
  if (options?.startDate) {
    transactions = transactions.filter((t) => t.date >= options.startDate!);
  }
  if (options?.endDate) {
    transactions = transactions.filter((t) => t.date <= options.endDate!);
  }

  return transactions;
}

export function subscribeToTransactions(
  userId: string,
  callback: (transactions: Transaction[]) => void
): () => void {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const transactions = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Transaction;
      });
      // Sort in memory to avoid needing composite index
      callback(transactions.sort((a, b) => b.date.localeCompare(a.date)));
    },
    (error) => {
      console.error('Error subscribing to transactions:', error);
      callback([]);
    }
  );
}

export async function updateTransaction(
  id: string,
  data: Partial<TransactionInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'transactions', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteDoc(doc(db, 'transactions', id));
}

// ============ SUBSCRIPTIONS ============

export async function createSubscription(
  userId: string,
  data: SubscriptionInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'subscriptions'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getSubscription(id: string): Promise<Subscription | null> {
  const docSnap = await getDoc(doc(db, 'subscriptions', id));
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  } as Subscription;
}

export async function getSubscriptions(
  userId: string,
  status?: 'active' | 'cancelled' | 'paused'
): Promise<Subscription[]> {
  const constraints: QueryConstraint[] = [
    where('userId', '==', userId),
    orderBy('nextBillingDate', 'asc'),
  ];

  if (status) {
    constraints.push(where('status', '==', status));
  }

  const q = query(collection(db, 'subscriptions'), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as Subscription;
  });
}

export function subscribeToSubscriptions(
  userId: string,
  callback: (subscriptions: Subscription[]) => void
): () => void {
  const q = query(
    collection(db, 'subscriptions'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const subscriptions = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Subscription;
      });
      // Sort in memory to avoid needing composite index
      callback(
        subscriptions.sort(
          (a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate)
        )
      );
    },
    (error) => {
      console.error('Error subscribing to subscriptions:', error);
      // Call callback with empty array so loading state is cleared
      callback([]);
    }
  );
}

export async function updateSubscription(
  id: string,
  data: Partial<SubscriptionInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'subscriptions', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSubscription(id: string): Promise<void> {
  await deleteDoc(doc(db, 'subscriptions', id));
}

// ============ PARTNERS ============

export async function createPartner(
  userId: string,
  data: PartnerInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'partners'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getPartners(userId: string): Promise<Partner[]> {
  const q = query(
    collection(db, 'partners'),
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as Partner;
  });
}

export function subscribeToPartners(
  userId: string,
  callback: (partners: Partner[]) => void
): () => void {
  const q = query(
    collection(db, 'partners'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const partners = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Partner;
      });
      // Sort in memory to avoid needing composite index
      callback(partners.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      console.error('Error subscribing to partners:', error);
      callback([]);
    }
  );
}

export async function updatePartner(
  id: string,
  data: Partial<PartnerInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'partners', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePartner(id: string): Promise<void> {
  await deleteDoc(doc(db, 'partners', id));
}

// ============ DISTRIBUTIONS ============

export async function createDistribution(
  data: Omit<Distribution, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'distributions'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getDistributions(partnerId?: string): Promise<Distribution[]> {
  let q;
  if (partnerId) {
    q = query(
      collection(db, 'distributions'),
      where('partnerId', '==', partnerId),
      orderBy('date', 'desc')
    );
  } else {
    q = query(collection(db, 'distributions'), orderBy('date', 'desc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
    } as Distribution;
  });
}

// ============ USER SETTINGS ============

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const docSnap = await getDoc(doc(db, 'settings', userId));
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  return {
    userId,
    ...data,
    updatedAt: convertTimestamp(data.updatedAt),
  } as UserSettings;
}

export async function saveUserSettings(
  userId: string,
  settings: Partial<Omit<UserSettings, 'userId' | 'updatedAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'settings', userId), {
    ...settings,
    updatedAt: serverTimestamp(),
  });
}

export async function createUserSettings(userId: string): Promise<void> {
  const defaultSettings: Omit<UserSettings, 'updatedAt'> = {
    userId,
    currency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    notifications: {
      email: true,
      billReminders: true,
      weeklyReport: false,
    },
  };

  await addDoc(collection(db, 'settings'), {
    ...defaultSettings,
    updatedAt: serverTimestamp(),
  });
}

// ============ CUSTOMERS ============

export async function createCustomer(
  userId: string,
  data: CustomerInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'customers'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getCustomers(userId: string): Promise<Customer[]> {
  const q = query(
    collection(db, 'customers'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  const customers = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as Customer;
  });
  // Sort in memory to avoid needing composite index
  return customers.sort((a, b) => a.name.localeCompare(b.name));
}

export function subscribeToCustomers(
  userId: string,
  callback: (customers: Customer[]) => void
): () => void {
  const q = query(
    collection(db, 'customers'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const customers = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Customer;
      });
      // Sort in memory
      callback(customers.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      console.error('Error subscribing to customers:', error);
      callback([]);
    }
  );
}

export async function updateCustomer(
  id: string,
  data: Partial<CustomerInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'customers', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, 'customers', id));
}

// ============ CONTRACTORS ============

export async function createContractor(
  userId: string,
  data: ContractorInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'contractors'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getContractors(userId: string): Promise<Contractor[]> {
  const q = query(
    collection(db, 'contractors'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  const contractors = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as Contractor;
  });
  // Sort in memory to avoid needing composite index
  return contractors.sort((a, b) => a.name.localeCompare(b.name));
}

export function subscribeToContractors(
  userId: string,
  callback: (contractors: Contractor[]) => void
): () => void {
  const q = query(
    collection(db, 'contractors'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const contractors = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Contractor;
      });
      // Sort in memory
      callback(contractors.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      console.error('Error subscribing to contractors:', error);
      callback([]);
    }
  );
}

export async function updateContractor(
  id: string,
  data: Partial<ContractorInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'contractors', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteContractor(id: string): Promise<void> {
  await deleteDoc(doc(db, 'contractors', id));
}

// ============ CONTRACTOR ASSIGNMENTS ============

export async function createAssignment(
  userId: string,
  data: ContractorAssignmentInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'assignments'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getAssignments(
  userId: string,
  options?: {
    contractorId?: string;
    customerId?: string;
    status?: 'active' | 'completed' | 'cancelled';
  }
): Promise<ContractorAssignment[]> {
  const q = query(
    collection(db, 'assignments'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  let assignments = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as ContractorAssignment;
  });

  // Filter in memory
  if (options?.status) {
    assignments = assignments.filter((a) => a.status === options.status);
  }
  if (options?.contractorId) {
    assignments = assignments.filter((a) => a.contractorId === options.contractorId);
  }
  if (options?.customerId) {
    assignments = assignments.filter((a) => a.customerId === options.customerId);
  }

  // Sort by startDate desc in memory
  return assignments.sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function subscribeToAssignments(
  userId: string,
  callback: (assignments: ContractorAssignment[]) => void
): () => void {
  const q = query(
    collection(db, 'assignments'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const assignments = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as ContractorAssignment;
      });
      // Sort in memory
      callback(assignments.sort((a, b) => b.startDate.localeCompare(a.startDate)));
    },
    (error) => {
      console.error('Error subscribing to assignments:', error);
      callback([]);
    }
  );
}

export async function updateAssignment(
  id: string,
  data: Partial<ContractorAssignmentInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'assignments', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAssignment(id: string): Promise<void> {
  await deleteDoc(doc(db, 'assignments', id));
}

// ============ CONTRACTOR TIMESHEETS ============

export async function createTimesheet(
  userId: string,
  data: ContractorTimesheetInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'timesheets'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getTimesheets(
  userId: string,
  options?: {
    month?: string;
    contractorId?: string;
    customerId?: string;
    assignmentId?: string;
    status?: 'draft' | 'submitted' | 'approved';
  }
): Promise<ContractorTimesheet[]> {
  const q = query(
    collection(db, 'timesheets'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  let timesheets = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as ContractorTimesheet;
  });

  // Filter in memory
  if (options?.month) {
    timesheets = timesheets.filter((t) => t.month === options.month);
  }
  if (options?.status) {
    timesheets = timesheets.filter((t) => t.status === options.status);
  }
  if (options?.contractorId) {
    timesheets = timesheets.filter((t) => t.contractorId === options.contractorId);
  }
  if (options?.customerId) {
    timesheets = timesheets.filter((t) => t.customerId === options.customerId);
  }
  if (options?.assignmentId) {
    timesheets = timesheets.filter((t) => t.assignmentId === options.assignmentId);
  }

  // Sort by month desc in memory
  return timesheets.sort((a, b) => b.month.localeCompare(a.month));
}

export function subscribeToTimesheets(
  userId: string,
  callback: (timesheets: ContractorTimesheet[]) => void
): () => void {
  const q = query(
    collection(db, 'timesheets'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const timesheets = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as ContractorTimesheet;
      });
      // Sort in memory
      callback(timesheets.sort((a, b) => b.month.localeCompare(a.month)));
    },
    (error) => {
      console.error('Error subscribing to timesheets:', error);
      callback([]);
    }
  );
}

export async function updateTimesheet(
  id: string,
  data: Partial<ContractorTimesheetInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'timesheets', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTimesheet(id: string): Promise<void> {
  await deleteDoc(doc(db, 'timesheets', id));
}

// ============ TEAM MEMBERS ============

export async function createTeamMember(
  userId: string,
  data: TeamMemberInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'teamMembers'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getTeamMembers(
  userId: string,
  status?: 'active' | 'inactive'
): Promise<TeamMember[]> {
  const q = query(
    collection(db, 'teamMembers'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  let members = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as TeamMember;
  });

  if (status) {
    members = members.filter((m) => m.status === status);
  }

  return members.sort((a, b) => a.name.localeCompare(b.name));
}

export function subscribeToTeamMembers(
  userId: string,
  callback: (members: TeamMember[]) => void
): () => void {
  const q = query(
    collection(db, 'teamMembers'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const members = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as TeamMember;
      });
      callback(members.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      console.error('Error subscribing to team members:', error);
      callback([]);
    }
  );
}

export async function updateTeamMember(
  id: string,
  data: Partial<TeamMemberInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'teamMembers', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTeamMember(id: string): Promise<void> {
  await deleteDoc(doc(db, 'teamMembers', id));
}

// ============ PAYROLL RECORDS ============

export async function createPayrollRecord(
  userId: string,
  data: PayrollRecordInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'payrollRecords'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getPayrollRecords(
  userId: string,
  options?: {
    month?: string;
    teamMemberId?: string;
    status?: 'pending' | 'paid';
  }
): Promise<PayrollRecord[]> {
  const q = query(
    collection(db, 'payrollRecords'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  let records = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as PayrollRecord;
  });

  if (options?.month) {
    records = records.filter((r) => r.month === options.month);
  }
  if (options?.teamMemberId) {
    records = records.filter((r) => r.teamMemberId === options.teamMemberId);
  }
  if (options?.status) {
    records = records.filter((r) => r.status === options.status);
  }

  return records.sort((a, b) => b.month.localeCompare(a.month));
}

export function subscribeToPayrollRecords(
  userId: string,
  callback: (records: PayrollRecord[]) => void
): () => void {
  const q = query(
    collection(db, 'payrollRecords'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as PayrollRecord;
      });
      callback(records.sort((a, b) => b.month.localeCompare(a.month)));
    },
    (error) => {
      console.error('Error subscribing to payroll records:', error);
      callback([]);
    }
  );
}

export async function updatePayrollRecord(
  id: string,
  data: Partial<PayrollRecordInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'payrollRecords', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePayrollRecord(id: string): Promise<void> {
  await deleteDoc(doc(db, 'payrollRecords', id));
}

// ============ RECRUITMENT MODULE ============

// ============ RECRUITMENT CLIENTS ============

export async function createRecruitmentClient(
  userId: string,
  data: RecruitmentClientInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'recruitmentClients'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getRecruitmentClients(userId: string): Promise<RecruitmentClient[]> {
  const q = query(
    collection(db, 'recruitmentClients'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as RecruitmentClient;
  });
}

export function subscribeToRecruitmentClients(
  userId: string,
  callback: (clients: RecruitmentClient[]) => void
): () => void {
  const q = query(
    collection(db, 'recruitmentClients'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const clients = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as RecruitmentClient;
      });
      callback(clients.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      console.error('Error subscribing to recruitment clients:', error);
      callback([]);
    }
  );
}

export async function updateRecruitmentClient(
  id: string,
  data: Partial<RecruitmentClientInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'recruitmentClients', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRecruitmentClient(id: string): Promise<void> {
  await deleteDoc(doc(db, 'recruitmentClients', id));
}

// ============ JOB ROLES ============

export async function createJobRole(
  userId: string,
  data: JobRoleInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'jobRoles'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getJobRoles(
  userId: string,
  options?: { clientId?: string; status?: string }
): Promise<JobRole[]> {
  const q = query(
    collection(db, 'jobRoles'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  let roles = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as JobRole;
  });

  if (options?.clientId) {
    roles = roles.filter((r) => r.clientId === options.clientId);
  }
  if (options?.status) {
    roles = roles.filter((r) => r.status === options.status);
  }

  return roles.sort((a, b) => b.openDate.localeCompare(a.openDate));
}

export function subscribeToJobRoles(
  userId: string,
  callback: (roles: JobRole[]) => void
): () => void {
  const q = query(
    collection(db, 'jobRoles'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const roles = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as JobRole;
      });
      callback(roles.sort((a, b) => b.openDate.localeCompare(a.openDate)));
    },
    (error) => {
      console.error('Error subscribing to job roles:', error);
      callback([]);
    }
  );
}

export async function updateJobRole(
  id: string,
  data: Partial<JobRoleInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'jobRoles', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteJobRole(id: string): Promise<void> {
  await deleteDoc(doc(db, 'jobRoles', id));
}

// ============ RECRUITERS ============

export async function createRecruiter(
  userId: string,
  data: RecruiterInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'recruiters'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getRecruiters(userId: string): Promise<Recruiter[]> {
  const q = query(
    collection(db, 'recruiters'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as Recruiter;
  });
}

export function subscribeToRecruiters(
  userId: string,
  callback: (recruiters: Recruiter[]) => void
): () => void {
  const q = query(
    collection(db, 'recruiters'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const recruiters = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Recruiter;
      });
      callback(recruiters.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      console.error('Error subscribing to recruiters:', error);
      callback([]);
    }
  );
}

export async function updateRecruiter(
  id: string,
  data: Partial<RecruiterInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'recruiters', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRecruiter(id: string): Promise<void> {
  await deleteDoc(doc(db, 'recruiters', id));
}

// ============ CANDIDATES ============

export async function createCandidate(
  userId: string,
  data: CandidateInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'candidates'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getCandidates(userId: string): Promise<Candidate[]> {
  const q = query(
    collection(db, 'candidates'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as Candidate;
  });
}

export function subscribeToCandidates(
  userId: string,
  callback: (candidates: Candidate[]) => void
): () => void {
  const q = query(
    collection(db, 'candidates'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const candidates = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Candidate;
      });
      callback(candidates.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      console.error('Error subscribing to candidates:', error);
      callback([]);
    }
  );
}

export async function updateCandidate(
  id: string,
  data: Partial<CandidateInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'candidates', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCandidate(id: string): Promise<void> {
  await deleteDoc(doc(db, 'candidates', id));
}

// ============ CANDIDATE SUBMISSIONS ============

export async function createCandidateSubmission(
  userId: string,
  data: CandidateSubmissionInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'candidateSubmissions'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getCandidateSubmissions(
  userId: string,
  options?: {
    clientId?: string;
    recruiterId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<CandidateSubmission[]> {
  const q = query(
    collection(db, 'candidateSubmissions'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  let submissions = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as CandidateSubmission;
  });

  if (options?.clientId) {
    submissions = submissions.filter((s) => s.clientId === options.clientId);
  }
  if (options?.recruiterId) {
    submissions = submissions.filter((s) => s.recruiterId === options.recruiterId);
  }
  if (options?.status) {
    submissions = submissions.filter((s) => s.status === options.status);
  }
  if (options?.dateFrom) {
    submissions = submissions.filter((s) => s.dateSubmitted >= options.dateFrom!);
  }
  if (options?.dateTo) {
    submissions = submissions.filter((s) => s.dateSubmitted <= options.dateTo!);
  }

  return submissions.sort((a, b) => b.dateSubmitted.localeCompare(a.dateSubmitted));
}

export function subscribeToCandidateSubmissions(
  userId: string,
  callback: (submissions: CandidateSubmission[]) => void
): () => void {
  const q = query(
    collection(db, 'candidateSubmissions'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const submissions = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as CandidateSubmission;
      });
      callback(submissions.sort((a, b) => b.dateSubmitted.localeCompare(a.dateSubmitted)));
    },
    (error) => {
      console.error('Error subscribing to candidate submissions:', error);
      callback([]);
    }
  );
}

export async function updateCandidateSubmission(
  id: string,
  data: Partial<CandidateSubmissionInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'candidateSubmissions', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCandidateSubmission(id: string): Promise<void> {
  await deleteDoc(doc(db, 'candidateSubmissions', id));
}

// ============ RECRUITER TASKS ============

export async function createRecruiterTask(
  userId: string,
  data: RecruiterTaskInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'recruiterTasks'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getRecruiterTasks(
  userId: string,
  options?: {
    recruiterId?: string;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    taskType?: string;
    status?: string;
  }
): Promise<RecruiterTask[]> {
  const q = query(
    collection(db, 'recruiterTasks'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  let tasks = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as RecruiterTask;
  });

  if (options?.recruiterId) {
    tasks = tasks.filter((t) => t.recruiterId === options.recruiterId);
  }
  if (options?.date) {
    tasks = tasks.filter((t) => t.date === options.date);
  }
  if (options?.dateFrom) {
    tasks = tasks.filter((t) => t.date >= options.dateFrom!);
  }
  if (options?.dateTo) {
    tasks = tasks.filter((t) => t.date <= options.dateTo!);
  }
  if (options?.taskType) {
    tasks = tasks.filter((t) => t.taskType === options.taskType);
  }
  if (options?.status) {
    tasks = tasks.filter((t) => t.status === options.status);
  }

  return tasks.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.time.localeCompare(a.time);
  });
}

export function subscribeToRecruiterTasks(
  userId: string,
  callback: (tasks: RecruiterTask[]) => void
): () => void {
  const q = query(
    collection(db, 'recruiterTasks'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const tasks = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as RecruiterTask;
      });
      callback(
        tasks.sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return b.time.localeCompare(a.time);
        })
      );
    },
    (error) => {
      console.error('Error subscribing to recruiter tasks:', error);
      callback([]);
    }
  );
}

export async function updateRecruiterTask(
  id: string,
  data: Partial<RecruiterTaskInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'recruiterTasks', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRecruiterTask(id: string): Promise<void> {
  await deleteDoc(doc(db, 'recruiterTasks', id));
}

// ============ CRM MODULE ============

// ============ CRM CLIENTS ============

export async function createCRMClient(
  userId: string,
  data: CRMClientInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'crmClients'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getCRMClients(
  userId: string,
  options?: {
    type?: string;
    status?: string;
    isContractorClient?: boolean;
    isRecruitmentClient?: boolean;
  }
): Promise<CRMClient[]> {
  const q = query(
    collection(db, 'crmClients'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  let clients = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as CRMClient;
  });

  if (options?.type) {
    clients = clients.filter((c) => c.type === options.type);
  }
  if (options?.status) {
    clients = clients.filter((c) => c.status === options.status);
  }
  if (options?.isContractorClient !== undefined) {
    clients = clients.filter((c) => c.isContractorClient === options.isContractorClient);
  }
  if (options?.isRecruitmentClient !== undefined) {
    clients = clients.filter((c) => c.isRecruitmentClient === options.isRecruitmentClient);
  }

  return clients.sort((a, b) => a.name.localeCompare(b.name));
}

export function subscribeToCRMClients(
  userId: string,
  callback: (clients: CRMClient[]) => void
): () => void {
  const q = query(
    collection(db, 'crmClients'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const clients = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as CRMClient;
      });
      callback(clients.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      console.error('Error subscribing to CRM clients:', error);
      callback([]);
    }
  );
}

export async function updateCRMClient(
  id: string,
  data: Partial<CRMClientInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'crmClients', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCRMClient(id: string): Promise<void> {
  await deleteDoc(doc(db, 'crmClients', id));
}

// ============ CRM DEALS ============

export async function createCRMDeal(
  userId: string,
  data: CRMDealInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'crmDeals'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getCRMDeals(
  userId: string,
  options?: {
    clientId?: string;
    stage?: string;
    status?: string;
    dealType?: string;
  }
): Promise<CRMDeal[]> {
  const q = query(
    collection(db, 'crmDeals'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  let deals = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as CRMDeal;
  });

  if (options?.clientId) {
    deals = deals.filter((d) => d.clientId === options.clientId);
  }
  if (options?.stage) {
    deals = deals.filter((d) => d.stage === options.stage);
  }
  if (options?.status) {
    deals = deals.filter((d) => d.status === options.status);
  }
  if (options?.dealType) {
    deals = deals.filter((d) => d.dealType === options.dealType);
  }

  return deals.sort((a, b) => {
    // Sort by expected close date, then by value
    if (a.expectedCloseDate && b.expectedCloseDate) {
      return a.expectedCloseDate.localeCompare(b.expectedCloseDate);
    }
    return b.value - a.value;
  });
}

export function subscribeToCRMDeals(
  userId: string,
  callback: (deals: CRMDeal[]) => void
): () => void {
  const q = query(
    collection(db, 'crmDeals'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const deals = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as CRMDeal;
      });
      callback(deals.sort((a, b) => b.value - a.value));
    },
    (error) => {
      console.error('Error subscribing to CRM deals:', error);
      callback([]);
    }
  );
}

export async function updateCRMDeal(
  id: string,
  data: Partial<CRMDealInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'crmDeals', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCRMDeal(id: string): Promise<void> {
  await deleteDoc(doc(db, 'crmDeals', id));
}

// ============ CRM INTERACTIONS ============

export async function createCRMInteraction(
  userId: string,
  data: CRMInteractionInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'crmInteractions'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getCRMInteractions(
  userId: string,
  options?: {
    clientId?: string;
    dealId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<CRMInteraction[]> {
  const q = query(
    collection(db, 'crmInteractions'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  let interactions = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as CRMInteraction;
  });

  if (options?.clientId) {
    interactions = interactions.filter((i) => i.clientId === options.clientId);
  }
  if (options?.dealId) {
    interactions = interactions.filter((i) => i.dealId === options.dealId);
  }
  if (options?.type) {
    interactions = interactions.filter((i) => i.type === options.type);
  }
  if (options?.dateFrom) {
    interactions = interactions.filter((i) => i.date >= options.dateFrom!);
  }
  if (options?.dateTo) {
    interactions = interactions.filter((i) => i.date <= options.dateTo!);
  }

  return interactions.sort((a, b) => b.date.localeCompare(a.date));
}

export function subscribeToCRMInteractions(
  userId: string,
  callback: (interactions: CRMInteraction[]) => void
): () => void {
  const q = query(
    collection(db, 'crmInteractions'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const interactions = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as CRMInteraction;
      });
      callback(interactions.sort((a, b) => b.date.localeCompare(a.date)));
    },
    (error) => {
      console.error('Error subscribing to CRM interactions:', error);
      callback([]);
    }
  );
}

export async function updateCRMInteraction(
  id: string,
  data: Partial<CRMInteractionInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'crmInteractions', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCRMInteraction(id: string): Promise<void> {
  await deleteDoc(doc(db, 'crmInteractions', id));
}

// ============ CRM NOTES ============

export async function createCRMNote(
  userId: string,
  data: CRMNoteInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'crmNotes'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getCRMNotes(
  userId: string,
  clientId?: string
): Promise<CRMNote[]> {
  const q = query(
    collection(db, 'crmNotes'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  let notes = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as CRMNote;
  });

  if (clientId) {
    notes = notes.filter((n) => n.clientId === clientId);
  }

  // Sort by pinned first, then by date
  return notes.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
}

export function subscribeToCRMNotes(
  userId: string,
  callback: (notes: CRMNote[]) => void
): () => void {
  const q = query(
    collection(db, 'crmNotes'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notes = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as CRMNote;
      });
      // Sort by pinned first, then by date
      callback(notes.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }));
    },
    (error) => {
      console.error('Error subscribing to CRM notes:', error);
      callback([]);
    }
  );
}

export async function updateCRMNote(
  id: string,
  data: Partial<CRMNoteInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'crmNotes', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCRMNote(id: string): Promise<void> {
  await deleteDoc(doc(db, 'crmNotes', id));
}
