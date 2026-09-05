import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, isStorageConfigured } from '../config/firebase';
import { compressImage, cropSquareAvatar } from './imageCompressor';
import { PropertyImageItem } from '../types';

export interface UploadProgressCallback {
  (progress: number, fileName: string): void;
}

/**
 * Format bytes to readable string (e.g., 2.4 MB, 450 KB)
 */
export function formatFileSize(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Validates a single image file for property uploads
 * Max 10MB, JPG/JPEG/PNG/WEBP only
 */
export function validatePropertyImageFile(
  file: File,
  existingFiles: { name: string; size: number }[] = []
): { valid: boolean; error?: string } {
  if (!file || !(file instanceof File)) {
    return {
      valid: false,
      error: 'Tệp không hợp lệ hoặc đã bị hủy.',
    };
  }

  const fileName = file.name || 'Ảnh';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // Check HEIC/HEIF
  if (
    ext === 'heic' ||
    ext === 'heif' ||
    file.type === 'image/heic' ||
    file.type === 'image/heif'
  ) {
    return {
      valid: false,
      error: `Ảnh "${fileName}" định dạng HEIC/HEIF của Apple. Vui lòng chuyển đổi sang JPG hoặc PNG trước khi tải lên.`,
    };
  }

  // Check executable or non-image
  const dangerousExts = ['exe', 'bat', 'sh', 'js', 'html', 'php', 'py', 'apk', 'msi', 'bin'];
  if (dangerousExts.includes(ext)) {
    return {
      valid: false,
      error: `Tệp "${fileName}" là tệp thực thi không an toàn, hệ thống từ chối tải lên.`,
    };
  }

  // Check allowed formats
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/pjpeg', 'image/x-png'];
  const isMimeValid = allowedMimeTypes.includes(file.type);
  const isExtValid = allowedExts.includes(ext);

  if (!isMimeValid && !isExtValid) {
    return {
      valid: false,
      error: `Ảnh "${fileName}" không đúng định dạng. Hệ thống chỉ hỗ trợ JPG, JPEG, PNG và WEBP.`,
    };
  }

  // Check 10MB size limit (10 * 1024 * 1024 bytes)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `Ảnh "${fileName}" (${formatFileSize(file.size)}) vượt quá dung lượng tối đa cho phép 10 MB.`,
    };
  }

  // Check duplicate
  const isDuplicate = existingFiles.some(
    (ef) => ef.name === file.name && ef.size === file.size
  );
  if (isDuplicate) {
    return {
      valid: false,
      error: `Ảnh "${fileName}" đã có trong danh sách tải lên.`,
    };
  }

  return { valid: true };
}

async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a single property image File/Blob directly to hosting storage or Firebase Storage:
 * Returns complete PropertyImageItem metadata with genuine downloadURL
 */
export async function uploadPropertyImageToStorage(
  file: File | Blob,
  propertyId: string,
  options: {
    fileName?: string;
    isCover?: boolean;
    sortOrder?: number;
    uploadedBy?: string;
    width?: number;
    height?: number;
    skipCompress?: boolean;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<PropertyImageItem> {
  if (!file || !(file instanceof File || file instanceof Blob)) {
    throw new Error('Đối tượng tệp không hợp lệ.');
  }

  const originalName = options.fileName || (file instanceof File ? file.name : `img_${Date.now()}.jpg`);
  const safeOriginalName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^/.]+$/, '');
  const timestamp = Date.now();

  // Use file directly or compress if not already compressed
  let fileToUpload: File | Blob = file;
  let finalWidth = options.width || 0;
  let finalHeight = options.height || 0;

  if (!options.skipCompress && file instanceof File && file.size > 800 * 1024) {
    try {
      const compressed = await compressImage(file, 1920, 1440, 0.85);
      fileToUpload = compressed.file;
      finalWidth = compressed.width;
      finalHeight = compressed.height;
    } catch (compressErr) {
      console.warn('Image compression fallback to direct upload:', compressErr);
      fileToUpload = file;
    }
  }

  // 1. Primary: Upload to hosting server (Spark plan compatible)
  try {
    if (options.onProgress) options.onProgress(25);
    const base64Data = await fileToBase64(fileToUpload);
    if (options.onProgress) options.onProgress(60);

    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data,
        fileName: originalName,
        propertyId,
      }),
    });

    if (res.ok) {
      let data: any = null;
      try {
        const text = await res.text();
        if (text && text.trim()) {
          data = JSON.parse(text);
        }
      } catch (parseErr) {
        console.warn('Lỗi đọc phản hồi upload:', parseErr);
      }
      if (data && data.success && data.url) {
        if (options.onProgress) options.onProgress(100);
        return {
          id: `${propertyId}_img_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
          propertyId: propertyId,
          fileName: originalName,
          storagePath: `uploads/${data.fileName}`,
          downloadURL: data.url,
          contentType: 'image/jpeg',
          size: data.size || fileToUpload.size,
          width: finalWidth || undefined,
          height: finalHeight || undefined,
          isCover: Boolean(options.isCover),
          sortOrder: options.sortOrder ?? 0,
          uploadedAt: new Date().toISOString(),
          uploadedBy: options.uploadedBy || 'Môi giới',
        };
      }
    }
  } catch (hostingErr) {
    console.warn('[Hosting Upload] Fallback attempt to Firebase Storage:', hostingErr);
  }

  // 2. Secondary fallback: Firebase Storage (if enabled)
  if (!isStorageConfigured) {
    throw new Error('Chưa kết nối Firebase Storage hoặc cấu hình Storage Bucket không hợp lệ.');
  }

  const uniqueFileName = `${timestamp}_${safeOriginalName}.jpg`;
  const storagePath = `properties/${propertyId}/images/${uniqueFileName}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload, {
      contentType: 'image/jpeg',
      customMetadata: {
        originalName: originalName,
        propertyId: propertyId,
        uploadedAt: new Date().toISOString(),
        uploadedBy: options.uploadedBy || 'Môi giới',
      },
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (options.onProgress) {
            options.onProgress(progress);
          }
        }
      },
      (error) => {
        console.error(`Firebase Storage upload error for ${originalName}:`, error);
        let errorMsg = `Lỗi tải ảnh "${originalName}": `;
        if (error.code === 'storage/unauthorized') {
          errorMsg += 'Không đủ quyền truy cập Firebase Storage.';
        } else if (error.code === 'storage/canceled') {
          errorMsg += 'Quá trình tải lên đã bị hủy.';
        } else if (error.code === 'storage/retry-limit-exceeded') {
          errorMsg += 'Hết thời gian chờ mạng khi tải ảnh lên. Vui lòng thử lại.';
        } else {
          errorMsg += error.message || 'Lỗi kết nối máy chủ lưu trữ ảnh.';
        }
        reject(new Error(errorMsg));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          const imageItem: PropertyImageItem = {
            id: `${propertyId}_img_${timestamp}_${Math.random().toString(36).substr(2, 6)}`,
            propertyId: propertyId,
            fileName: originalName,
            storagePath: storagePath,
            downloadURL: downloadUrl,
            contentType: 'image/jpeg',
            size: fileToUpload.size,
            width: finalWidth || undefined,
            height: finalHeight || undefined,
            isCover: Boolean(options.isCover),
            sortOrder: options.sortOrder ?? 0,
            uploadedAt: new Date().toISOString(),
            uploadedBy: options.uploadedBy || 'Môi giới',
          };
          resolve(imageItem);
        } catch (err: any) {
          reject(new Error(`Không thể lấy đường dẫn tải ảnh cho "${originalName}": ${err.message}`));
        }
      }
    );
  });
}

/**
 * Upload multiple property images independently using Promise.allSettled
 */
export async function uploadMultiplePropertyImages(
  items: {
    file: File;
    fileName: string;
    isCover?: boolean;
    sortOrder?: number;
    width?: number;
    height?: number;
  }[],
  propertyId: string,
  uploadedBy?: string,
  onItemProgress?: (index: number, progress: number) => void
): Promise<{
  successful: PropertyImageItem[];
  failed: { index: number; fileName: string; error: string }[];
  totalAttempted: number;
}> {
  const totalAttempted = items.length;
  if (totalAttempted === 0) {
    return { successful: [], failed: [], totalAttempted: 0 };
  }

  const uploadPromises = items.map((item, index) =>
    uploadPropertyImageToStorage(item.file, propertyId, {
      fileName: item.fileName,
      isCover: item.isCover,
      sortOrder: item.sortOrder ?? index,
      uploadedBy: uploadedBy,
      width: item.width,
      height: item.height,
      skipCompress: true, // Already compressed during staging
      onProgress: (progress) => {
        if (onItemProgress) onItemProgress(index, progress);
      },
    })
  );

  const results = await Promise.allSettled(uploadPromises);

  const successful: PropertyImageItem[] = [];
  const failed: { index: number; fileName: string; error: string }[] = [];

  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      const errorReason = result.reason?.message || 'Lỗi tải ảnh lên Storage';
      failed.push({
        index: idx,
        fileName: items[idx].fileName,
        error: errorReason,
      });
    }
  });

  return {
    successful,
    failed,
    totalAttempted,
  };
}

/**
 * Legacy wrapper for single property image upload
 */
export async function uploadPropertyImage(
  file: File,
  propertyId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const result = await uploadPropertyImageToStorage(file, propertyId, { onProgress });
  return result.downloadURL;
}

/**
 * Delete an image from Firebase Storage
 */
export async function deleteStorageFile(storagePathOrUrl: string): Promise<boolean> {
  try {
    if (!storagePathOrUrl) return false;
    let storageRef;
    if (storagePathOrUrl.startsWith('http://') || storagePathOrUrl.startsWith('https://')) {
      storageRef = ref(storage, storagePathOrUrl);
    } else {
      storageRef = ref(storage, storagePathOrUrl);
    }
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.warn('Delete storage file error:', error);
    return false;
  }
}

/**
 * Uploads a system logo to Firebase Storage
 */
/**
 * Uploads a system logo to hosting storage or Firebase Storage
 */
export async function uploadSystemLogo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const validExts = ['png', 'jpg', 'jpeg', 'webp', 'svg'];

  if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
    throw new Error('Định dạng tệp logo không hợp lệ. Vui lòng chọn tệp PNG, JPG, WEBP hoặc SVG.');
  }

  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('Dung lượng tệp logo vượt quá giới hạn tối đa 5 MB.');
  }

  let fileToUpload: File | Blob = file;
  if (file.type !== 'image/svg+xml' && ext !== 'svg') {
    try {
      const compressed = await compressImage(file, 800, 800, 0.92);
      fileToUpload = compressed.file;
    } catch (e) {
      fileToUpload = file;
    }
  }

  // 1. Try hosting server upload
  try {
    if (onProgress) onProgress(30);
    const base64Data = await fileToBase64(fileToUpload);
    if (onProgress) onProgress(60);

    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data,
        fileName: `logo_${Date.now()}.${ext || 'png'}`,
        propertyId: 'system',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.url) {
        if (onProgress) onProgress(100);
        return data.url;
      }
    }
  } catch (err) {
    console.warn('[SystemLogo Upload] Fallback attempt to Firebase Storage:', err);
  }

  // 2. Secondary fallback: Firebase Storage
  if (!isStorageConfigured) {
    throw new Error('Không thể tải ảnh lên máy chủ và chưa kết nối Firebase Storage.');
  }

  const timestamp = Date.now();
  const safeExt = ext === 'svg' ? 'svg' : 'png';
  const storagePath = `settings/logo_${timestamp}.${safeExt}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload, {
      contentType: (fileToUpload as File).type || (ext === 'svg' ? 'image/svg+xml' : 'image/png'),
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(progress);
      },
      (error) => {
        reject(new Error(`Lỗi tải logo: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err: any) {
          reject(new Error(`Lỗi lấy link logo: ${err.message}`));
        }
      }
    );
  });
}

/**
 * Uploads user avatar to hosting storage or Firebase Storage
 */
export async function uploadUserAvatar(
  arg1: File | string,
  arg2: File | string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const file = (arg1 instanceof File ? arg1 : arg2) as File;
  const userId = (typeof arg1 === 'string' ? arg1 : typeof arg2 === 'string' ? arg2 : 'anonymous') as string;

  if (!file || !(file instanceof File)) {
    throw new Error('Tệp tải lên không hợp lệ.');
  }

  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const validExts = ['png', 'jpg', 'jpeg', 'webp'];

  if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
    throw new Error('Định dạng ảnh không hợp lệ. Vui lòng chọn ảnh định dạng PNG, JPG hoặc WEBP.');
  }

  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('Dung lượng ảnh đại diện vượt quá giới hạn tối đa 5 MB.');
  }

  let fileToUpload: File | Blob = file;
  try {
    const cropped = await cropSquareAvatar(file, 400, 0.88);
    fileToUpload = cropped.file;
  } catch (e) {
    fileToUpload = file;
  }

  // 1. Try hosting server upload
  try {
    if (onProgress) onProgress(30);
    const base64Data = await fileToBase64(fileToUpload);
    if (onProgress) onProgress(60);

    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data,
        fileName: `avatar_${userId}_${Date.now()}.${ext || 'jpg'}`,
        propertyId: 'avatars',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.url) {
        if (onProgress) onProgress(100);
        return data.url;
      }
    }
  } catch (err) {
    console.warn('[Avatar Upload] Fallback attempt to Firebase Storage:', err);
  }

  // 2. Secondary fallback: Firebase Storage
  if (!isStorageConfigured) {
    throw new Error('Không thể tải ảnh đại diện lên máy chủ và chưa cấu hình Firebase Storage.');
  }

  const timestamp = Date.now();
  const storagePath = `users/${userId || 'anonymous'}/avatar_${timestamp}.jpg`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
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
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(progress);
      },
      (error) => {
        reject(new Error(`Lỗi tải ảnh đại diện: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err: any) {
          reject(new Error(`Lỗi lấy link ảnh đại diện: ${err.message}`));
        }
      }
    );
  });
}
