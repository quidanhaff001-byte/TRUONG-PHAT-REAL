import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';
import { compressImage } from './imageCompressor';

export interface UploadProgressCallback {
  (progress: number, fileName: string): void;
}

/**
 * Uploads a single image to Firebase Storage with compression
 */
export async function uploadPropertyImage(
  file: File,
  propertyCode: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Compress client-side first to optimize bandwidth and storage
  const compressed = await compressImage(file, 1920, 1440, 0.85);
  const fileToUpload = compressed.file;

  const timestamp = Date.now();
  const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `properties/${propertyCode || 'general'}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload, {
      contentType: fileToUpload.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(Math.round(progress));
        }
      },
      (error) => {
        console.error('Firebase Storage upload error:', error);
        // Fallback to dataUrl if storage is restricted or offline
        resolve(compressed.dataUrl);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err) {
          resolve(compressed.dataUrl);
        }
      }
    );
  });
}

/**
 * Uploads a document (PDF, DOCX, scan) to Firebase Storage
 */
export async function uploadLegalDocument(
  file: File,
  propertyCode: string
): Promise<string> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `legal_docs/${propertyCode || 'general'}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  try {
    const snapshot = await uploadBytesResumable(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error('Document upload error:', error);
    return URL.createObjectURL(file);
  }
}
