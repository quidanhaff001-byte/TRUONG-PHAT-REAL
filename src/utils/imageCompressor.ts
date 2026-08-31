/**
 * Client-side image compression and resizing utility for mobile camera photos
 */
export async function compressImage(
  file: File,
  maxWidth = 1600,
  maxHeight = 1200,
  quality = 0.82
): Promise<{ file: File; dataUrl: string; width: number; height: number; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    const originalSize = file.size;
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate scaling
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot create canvas context'));
          return;
        }

        // Draw and smooth
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob compression failed'));
              return;
            }

            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            const dataUrl = canvas.toDataURL('image/jpeg', quality);

            resolve({
              file: compressedFile,
              dataUrl,
              width,
              height,
              originalSize,
              compressedSize: blob.size,
            });
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image into object'));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Crops an avatar image to a 1:1 square centered and resizes to standard avatar resolution (e.g., 400x400)
 */
export async function cropSquareAvatar(
  file: File,
  dimension = 400,
  quality = 0.88
): Promise<{ file: File; dataUrl: string; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const minSide = Math.min(img.width, img.height);
        const startX = Math.round((img.width - minSide) / 2);
        const startY = Math.round((img.height - minSide) / 2);

        const canvas = document.createElement('canvas');
        canvas.width = dimension;
        canvas.height = dimension;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Center crop square
        ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, dimension, dimension);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Avatar crop failed'));
              return;
            }

            const croppedFile = new File([blob], `avatar_${Date.now()}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            const dataUrl = canvas.toDataURL('image/jpeg', quality);

            resolve({
              file: croppedFile,
              dataUrl,
              size: blob.size,
            });
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Cannot load avatar image'));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read avatar file'));
    reader.readAsDataURL(file);
  });
}

