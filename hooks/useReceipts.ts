import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  uploadReceipt,
  deleteReceipt,
  getUserReceipts,
  validateReceiptFile,
  UploadResult,
} from '../services/storageService';
import toast from 'react-hot-toast';

export function useReceipts() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<UploadResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchReceipts = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const data = await getUserReceipts(user.uid);
      setReceipts(data);
    } catch (err) {
      console.error('Error fetching receipts:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setReceipts([]);
      setLoading(false);
      return;
    }

    fetchReceipts();
  }, [user?.uid, fetchReceipts]);

  const upload = async (
    file: File,
    transactionId?: string
  ): Promise<UploadResult | null> => {
    if (!user?.uid) {
      toast.error('You must be logged in');
      return null;
    }

    // Validate file
    const validation = validateReceiptFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return null;
    }

    try {
      setUploading(true);
      const result = await uploadReceipt(user.uid, file, transactionId);
      toast.success('Receipt uploaded');
      await fetchReceipts();
      return result;
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload receipt');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const remove = async (path: string): Promise<boolean> => {
    try {
      await deleteReceipt(path);
      toast.success('Receipt deleted');
      await fetchReceipts();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete receipt');
      return false;
    }
  };

  return {
    receipts,
    loading,
    uploading,
    upload,
    remove,
    refresh: fetchReceipts,
  };
}
