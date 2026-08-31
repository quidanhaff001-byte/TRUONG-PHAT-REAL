import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';
import { compressImage, cropSquareAvatar } from './imageCompressor';

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
 * Uploads a system logo (PNG, JPG, WEBP, SVG) to Firebase Storage
 * Max 2MB, formats: png, jpg, jpeg, webp, svg
 */
export async function uploadSystemLogo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Format check
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const validExts = ['png', 'jpg', 'jpeg', 'webp', 'svg'];

  if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
    throw new Error('Định dạng tệp logo không hợp lệ. Vui lòng chọn tệp PNG, JPG, WEBP hoặc SVG.');
  }

  // Max 2MB (2 * 1024 * 1024 bytes)
  const MAX_SIZE = 2 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('Dung lượng tệp logo vượt quá giới hạn tối đa 2 MB.');
  }

  let fileToUpload = file;
  let fallbackDataUrl = '';

  // If raster image, compress lightly to standard max dimension
  if (file.type !== 'image/svg+xml' && ext !== 'svg') {
    const compressed = await compressImage(file, 800, 800, 0.92);
    fileToUpload = compressed.file;
    fallbackDataUrl = compressed.dataUrl;
  } else {
    // For SVG, read data URL as fallback
    fallbackDataUrl = await new Promise((res) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  const timestamp = Date.now();
  const safeExt = ext === 'svg' ? 'svg' : 'png';
  const storagePath = `settings/logo_${timestamp}.${safeExt}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve) => {
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload, {
      contentType: fileToUpload.type || (ext === 'svg' ? 'image/svg+xml' : 'image/png'),
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
        console.warn('Firebase Storage logo upload fallback:', error);
        resolve(fallbackDataUrl);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch {
          resolve(fallbackDataUrl);
        }
      }
    );
  });
}

/**
 * Uploads a user avatar (PNG, JPG, WEBP) to Firebase Storage
 * Max 3MB, cropped to square (400x400)
 */
export async function uploadUserAvatar(
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const validExts = ['png', 'jpg', 'jpeg', 'webp'];

  if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
    throw new Error('Định dạng ảnh không hợp lệ. Vui lòng chọn ảnh định dạng PNG, JPG hoặc WEBP.');
  }

  // Max 3MB (3 * 1024 * 1024 bytes)
  const MAX_SIZE = 3 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('Dung lượng ảnh đại diện vượt quá giới hạn tối đa 3 MB.');
  }

  // Crop to square 400x400
  const cropped = await cropSquareAvatar(file, 400, 0.88);
  const fileToUpload = cropped.file;

  const timestamp = Date.now();
  const storagePath = `users/${userId || 'anonymous'}/avatar_${timestamp}.jpg`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve) => {
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload, {
      contentType: 'image/jpeg',
      customMetadata: {
        originalName: file.name,
        userId: userId,
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
        console.warn('Firebase Storage avatar upload fallback:', error);
        resolve(cropped.dataUrl);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch {
          resolve(cropped.dataUrl);
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

