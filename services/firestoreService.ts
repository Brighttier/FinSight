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
