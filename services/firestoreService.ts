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
} from '../types';

// Helper to convert Firestore timestamps to Date
const convertTimestamp = (timestamp: any): Date | undefined => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
};

// ============ TRANSACTIONS ============

export async function createTransaction(
  userId: string,
  data: TransactionInput
): Promise<string> {
  const docRef = await addDoc(collection(db, 'transactions'), {
    ...data,
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
    where('userId', '==', userId),
    orderBy('date', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as Transaction;
    });
    callback(transactions);
  });
}

export async function updateTransaction(
  id: string,
  data: Partial<TransactionInput>
): Promise<void> {
  await updateDoc(doc(db, 'transactions', id), {
    ...data,
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
  const docRef = await addDoc(collection(db, 'subscriptions'), {
    ...data,
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
    where('userId', '==', userId),
    orderBy('nextBillingDate', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const subscriptions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as Subscription;
    });
    callback(subscriptions);
  });
}

export async function updateSubscription(
  id: string,
  data: Partial<SubscriptionInput>
): Promise<void> {
  await updateDoc(doc(db, 'subscriptions', id), {
    ...data,
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
  const docRef = await addDoc(collection(db, 'partners'), {
    ...data,
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
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const partners = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as Partner;
    });
    callback(partners);
  });
}

export async function updatePartner(
  id: string,
  data: Partial<PartnerInput>
): Promise<void> {
  await updateDoc(doc(db, 'partners', id), {
    ...data,
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
