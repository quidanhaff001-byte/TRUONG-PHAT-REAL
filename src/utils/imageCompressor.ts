/**
 * Client-side image compression, validation, and resizing utility
 */

/**
 * Standard Promise-wrapped FileReader reading File/Blob to Base64 Data URL
 */
export function readFileAsDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !((file as unknown) instanceof Blob)) {
      reject(new Error("Đối tượng không phải là tệp ảnh hợp lệ"));
      return;
    }
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Không thể đọc nội dung ảnh"));
      }
    };

    reader.onerror = () => {
      reject(reader.error || new Error("Không thể đọc tệp ảnh"));
    };

    reader.onabort = () => {
      reject(new Error("Quá trình đọc ảnh đã bị hủy"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compress an image file using HTML5 Canvas and canvas.toBlob
 * Returns a new compressed File instance, dimensions, and dataUrl preview
 */
export async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1440,
  quality = 0.85
): Promise<{
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}> {
  if (!file || !((file as unknown) instanceof Blob)) {
    throw new Error('Tệp truyền vào không phải là File hoặc Blob hợp lệ.');
  }

  const originalSize = file.size;

  // Step 1: Read image data safely
  let imageSourceUrl: string;
  let isObjectURL = false;

  try {
    imageSourceUrl = await readFileAsDataURL(file);
  } catch (readErr) {
    // Fallback to object URL if FileReader fails
    imageSourceUrl = URL.createObjectURL(file);
    isObjectURL = true;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate scaling preserving aspect ratio
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
          // If canvas context unavailable, resolve with original file
          if (isObjectURL) URL.revokeObjectURL(imageSourceUrl);
          resolve({
            file,
            dataUrl: imageSourceUrl,
            width: img.naturalWidth || 0,
            height: img.naturalHeight || 0,
            originalSize,
            compressedSize: originalSize,
          });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (isObjectURL) URL.revokeObjectURL(imageSourceUrl);

            if (!blob) {
              // Fallback to original file
              resolve({
                file,
                dataUrl: imageSourceUrl,
                width,
                height,
                originalSize,
                compressedSize: originalSize,
              });
              return;
            }

            const rawName = file.name ? file.name.replace(/\.[^/.]+$/, '') : `img_${Date.now()}`;
            const safeName = `${rawName}.jpg`;

            const compressedFile = new File([blob], safeName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            let dataUrl = imageSourceUrl;
            try {
              dataUrl = canvas.toDataURL('image/jpeg', quality);
            } catch (e) {
              // Ignore if toDataURL fails
            }

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
      } catch (procErr: any) {
        if (isObjectURL) URL.revokeObjectURL(imageSourceUrl);
        // Fallback to original file on processing error
        resolve({
          file,
          dataUrl: imageSourceUrl,
          width: 0,
          height: 0,
          originalSize,
          compressedSize: originalSize,
        });
      }
    };

    img.onerror = () => {
      if (isObjectURL) URL.revokeObjectURL(imageSourceUrl);
      reject(new Error(`Không thể giải mã dữ liệu ảnh "${file.name || 'hình ảnh'}"`));
    };

    img.src = imageSourceUrl;
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
  if (!file || !((file as unknown) instanceof Blob)) {
    throw new Error('Tệp truyền vào không phải là File hoặc Blob hợp lệ.');
  }

  let imageSourceUrl: string;
  let isObjectURL = false;

  try {
    imageSourceUrl = await readFileAsDataURL(file);
  } catch (e) {
    imageSourceUrl = URL.createObjectURL(file);
    isObjectURL = true;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        const minSide = Math.min(width, height);
        const startX = Math.round((width - minSide) / 2);
        const startY = Math.round((height - minSide) / 2);

        const canvas = document.createElement('canvas');
        canvas.width = dimension;
        canvas.height = dimension;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (isObjectURL) URL.revokeObjectURL(imageSourceUrl);
          resolve({
            file,
            dataUrl: imageSourceUrl,
            size: file.size,
          });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, dimension, dimension);

        canvas.toBlob(
          (blob) => {
            if (isObjectURL) URL.revokeObjectURL(imageSourceUrl);

            if (!blob) {
              resolve({
                file,
                dataUrl: imageSourceUrl,
                size: file.size,
              });
              return;
            }

            const croppedFile = new File([blob], `avatar_${Date.now()}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            let dataUrl = imageSourceUrl;
            try {
              dataUrl = canvas.toDataURL('image/jpeg', quality);
            } catch (e) {
              // Ignore
            }

            resolve({
              file: croppedFile,
              dataUrl,
              size: blob.size,
            });
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        if (isObjectURL) URL.revokeObjectURL(imageSourceUrl);
        resolve({
          file,
          dataUrl: imageSourceUrl,
          size: file.size,
        });
      }
    };

    img.onerror = () => {
      if (isObjectURL) URL.revokeObjectURL(imageSourceUrl);
      reject(new Error('Không thể tải dữ liệu ảnh đại diện'));
    };

    img.src = imageSourceUrl;
  });
}
