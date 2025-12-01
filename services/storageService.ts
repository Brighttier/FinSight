import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './firebase';

export interface UploadResult {
  url: string;
  path: string;
  name: string;
}

/**
 * Upload a receipt image to Firebase Storage
 */
export async function uploadReceipt(
  userId: string,
  file: File,
  transactionId?: string
): Promise<UploadResult> {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = transactionId
    ? `receipts/${userId}/${transactionId}/${timestamp}_${sanitizedName}`
    : `receipts/${userId}/${timestamp}_${sanitizedName}`;

  const storageRef = ref(storage, path);

  // Upload the file
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  // Get the download URL
  const url = await getDownloadURL(snapshot.ref);

  return {
    url,
    path,
    name: file.name,
  };
}

/**
 * Delete a receipt from Firebase Storage
 */
export async function deleteReceipt(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * Get all receipts for a user
 */
export async function getUserReceipts(userId: string): Promise<UploadResult[]> {
  try {
    const listRef = ref(storage, `receipts/${userId}`);
    const result = await listAll(listRef);

    const receipts: UploadResult[] = [];

    for (const itemRef of result.items) {
      try {
        const url = await getDownloadURL(itemRef);
        receipts.push({
          url,
          path: itemRef.fullPath,
          name: itemRef.name,
        });
      } catch (err) {
        console.warn('Failed to get download URL for receipt:', itemRef.fullPath, err);
      }
    }

    // Also check subdirectories (transaction-linked receipts)
    for (const folderRef of result.prefixes) {
      try {
        const subResult = await listAll(folderRef);
        for (const itemRef of subResult.items) {
          try {
            const url = await getDownloadURL(itemRef);
            receipts.push({
              url,
              path: itemRef.fullPath,
              name: itemRef.name,
            });
          } catch (err) {
            console.warn('Failed to get download URL for receipt:', itemRef.fullPath, err);
          }
        }
      } catch (err) {
        console.warn('Failed to list subdirectory:', folderRef.fullPath, err);
      }
    }

    return receipts;
  } catch (err: any) {
    // If the folder doesn't exist or there's a permission error, return empty array
    console.warn('Failed to list receipts:', err?.message || err);
    return [];
  }
}

/**
 * Validate file before upload
 */
export function validateReceiptFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not supported. Please upload an image (JPEG, PNG, GIF, WebP) or PDF.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File is too large. Maximum size is 10MB.',
    };
  }

  return { valid: true };
}

/**
 * Upload a contract file to Firebase Storage
 */
export async function uploadContractFile(
  userId: string,
  file: File,
  assignmentId?: string
): Promise<UploadResult> {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = assignmentId
    ? `contracts/${userId}/${assignmentId}/${timestamp}_${sanitizedName}`
    : `contracts/${userId}/${timestamp}_${sanitizedName}`;

  const storageRef = ref(storage, path);

  // Upload the file
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  // Get the download URL
  const url = await getDownloadURL(snapshot.ref);

  return {
    url,
    path,
    name: file.name,
  };
}

/**
 * Delete a contract file from Firebase Storage
 */
export async function deleteContractFile(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * Validate contract file before upload
 */
export function validateContractFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not supported. Please upload an image, PDF, or Word document.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File is too large. Maximum size is 10MB.',
    };
  }

  return { valid: true };
}
