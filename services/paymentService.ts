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
  serverTimestamp,
  Timestamp,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Payment, PaymentInput, PaymentStatus } from '../types';

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

// ============ PAYMENTS ============

export async function createPayment(
  userId: string,
  data: PaymentInput
): Promise<string> {
  const cleanData = removeUndefinedValues(data);
  const docRef = await addDoc(collection(db, 'payments'), {
    ...cleanData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getPayment(id: string): Promise<Payment | null> {
  const docSnap = await getDoc(doc(db, 'payments', id));
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  } as Payment;
}

export async function getPayments(
  userId: string,
  options?: {
    transactionId?: string;
    timesheetId?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<Payment[]> {
  const q = query(
    collection(db, 'payments'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  let payments = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as Payment;
  });

  // Filter in memory
  if (options?.transactionId) {
    payments = payments.filter((p) => p.transactionId === options.transactionId);
  }
  if (options?.timesheetId) {
    payments = payments.filter((p) => p.timesheetId === options.timesheetId);
  }
  if (options?.startDate) {
    payments = payments.filter((p) => p.paymentDate >= options.startDate!);
  }
  if (options?.endDate) {
    payments = payments.filter((p) => p.paymentDate <= options.endDate!);
  }

  // Sort by payment date desc
  return payments.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
}

export async function getPaymentsForTransaction(
  userId: string,
  transactionId: string
): Promise<Payment[]> {
  return getPayments(userId, { transactionId });
}

export async function getPaymentsForTimesheet(
  userId: string,
  timesheetId: string
): Promise<Payment[]> {
  return getPayments(userId, { timesheetId });
}

export function subscribeToPayments(
  userId: string,
  callback: (payments: Payment[]) => void
): () => void {
  const q = query(
    collection(db, 'payments'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const payments = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Payment;
      });
      // Sort by payment date desc in memory
      callback(payments.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)));
    },
    (error) => {
      console.error('Error subscribing to payments:', error);
      callback([]);
    }
  );
}

export function subscribeToPaymentsForTransaction(
  userId: string,
  transactionId: string,
  callback: (payments: Payment[]) => void
): () => void {
  const q = query(
    collection(db, 'payments'),
    where('userId', '==', userId),
    where('transactionId', '==', transactionId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const payments = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Payment;
      });
      callback(payments.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)));
    },
    (error) => {
      console.error('Error subscribing to payments for transaction:', error);
      callback([]);
    }
  );
}

export function subscribeToPaymentsForTimesheet(
  userId: string,
  timesheetId: string,
  callback: (payments: Payment[]) => void
): () => void {
  const q = query(
    collection(db, 'payments'),
    where('userId', '==', userId),
    where('timesheetId', '==', timesheetId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const payments = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Payment;
      });
      callback(payments.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)));
    },
    (error) => {
      console.error('Error subscribing to payments for timesheet:', error);
      callback([]);
    }
  );
}

export async function updatePayment(
  id: string,
  data: Partial<PaymentInput>
): Promise<void> {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(db, 'payments', id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePayment(id: string): Promise<void> {
  await deleteDoc(doc(db, 'payments', id));
}

// ============ PAYMENT SUMMARY CALCULATIONS ============

export interface PaymentSummary {
  totalPaid: number;
  remainingBalance: number;
  paymentStatus: PaymentStatus;
  paymentCount: number;
  lastPaymentDate?: string;
}

export function calculatePaymentSummary(
  totalAmount: number,
  payments: Payment[]
): PaymentSummary {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, totalAmount - totalPaid);

  let paymentStatus: PaymentStatus = 'unpaid';
  if (totalPaid >= totalAmount) {
    paymentStatus = 'paid';
  } else if (totalPaid > 0) {
    paymentStatus = 'partial';
  }

  const sortedPayments = [...payments].sort((a, b) =>
    b.paymentDate.localeCompare(a.paymentDate)
  );

  return {
    totalPaid,
    remainingBalance,
    paymentStatus,
    paymentCount: payments.length,
    lastPaymentDate: sortedPayments[0]?.paymentDate,
  };
}

export async function getPaymentSummaryForTransaction(
  userId: string,
  transactionId: string,
  totalAmount: number
): Promise<PaymentSummary> {
  const payments = await getPaymentsForTransaction(userId, transactionId);
  return calculatePaymentSummary(totalAmount, payments);
}

export async function getPaymentSummaryForTimesheet(
  userId: string,
  timesheetId: string,
  totalAmount: number
): Promise<PaymentSummary> {
  const payments = await getPaymentsForTimesheet(userId, timesheetId);
  return calculatePaymentSummary(totalAmount, payments);
}

// ============ BATCH OPERATIONS ============

export async function deletePaymentsForTransaction(
  userId: string,
  transactionId: string
): Promise<number> {
  const payments = await getPaymentsForTransaction(userId, transactionId);

  if (payments.length === 0) return 0;

  const batch = writeBatch(db);
  payments.forEach((payment) => {
    batch.delete(doc(db, 'payments', payment.id));
  });
  await batch.commit();

  return payments.length;
}

export async function deletePaymentsForTimesheet(
  userId: string,
  timesheetId: string
): Promise<number> {
  const payments = await getPaymentsForTimesheet(userId, timesheetId);

  if (payments.length === 0) return 0;

  const batch = writeBatch(db);
  payments.forEach((payment) => {
    batch.delete(doc(db, 'payments', payment.id));
  });
  await batch.commit();

  return payments.length;
}
