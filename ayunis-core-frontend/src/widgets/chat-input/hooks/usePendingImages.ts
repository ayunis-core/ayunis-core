import {
  MAX_IMAGES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_TOTAL_IMAGE_SIZE_BYTES,
} from '@/widgets/chat-input/model/image-upload-policy';
import { useState, useCallback } from 'react';

export interface PendingImage {
  id: string;
  file: File;
  preview: string;
  objectName?: string;
}

export interface AddImagesResult {
  added: number;
  limitExceeded: boolean;
  oversizedRejected: boolean;
  totalExceeded: boolean;
}

function selectWithinTotal(files: File[], attachedBytes: number): File[] {
  let total = attachedBytes;
  return files.filter((file) => {
    if (total + file.size > MAX_TOTAL_IMAGE_SIZE_BYTES) return false;
    total += file.size;
    return true;
  });
}

export function usePendingImages() {
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);

  const addImages = useCallback(
    (files: File[]): AddImagesResult => {
      const imagesWithinSizeLimit = files.filter(
        (file) => file.size <= MAX_IMAGE_SIZE_BYTES,
      );
      const oversizedRejected = imagesWithinSizeLimit.length < files.length;
      const currentCount = pendingImages.length;
      const remainingSlots = MAX_IMAGES - currentCount;

      if (remainingSlots <= 0) {
        return {
          added: 0,
          limitExceeded: true,
          oversizedRejected,
          totalExceeded: false,
        };
      }

      const withinTotal = selectWithinTotal(
        imagesWithinSizeLimit,
        pendingImages.reduce((sum, img) => sum + img.file.size, 0),
      );
      const filesToAdd = withinTotal.slice(0, remainingSlots);
      const newImages = filesToAdd.map((file) => {
        // eslint-disable-next-line sonarjs/pseudo-random -- Unique ID for UI tracking, not security-sensitive
        const id = `${Date.now()}-${Math.random()}`;
        const preview = URL.createObjectURL(file);

        return { id, file, preview };
      });

      setPendingImages((prev) => [...prev, ...newImages]);

      return {
        added: newImages.length,
        limitExceeded: withinTotal.length > remainingSlots,
        oversizedRejected,
        totalExceeded: withinTotal.length < imagesWithinSizeLimit.length,
      };
    },
    [pendingImages],
  );

  const removeImage = useCallback((imageId: string): void => {
    setPendingImages((prev) => {
      const image = prev.find((img) => img.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter((img) => img.id !== imageId);
    });
  }, []);

  const setImageObjectName = useCallback(
    (imageId: string, objectName: string): void => {
      setPendingImages((prev) =>
        prev.map((img) => (img.id === imageId ? { ...img, objectName } : img)),
      );
    },
    [],
  );

  const clearImages = useCallback((): void => {
    pendingImages.forEach((img) => URL.revokeObjectURL(img.preview));
    setPendingImages([]);
  }, [pendingImages]);

  const getImagesForContext = useCallback((): Array<{
    file: File;
    altText?: string;
  }> => {
    return pendingImages.map((img) => ({
      file: img.file,
      altText: img.file.name || 'Pasted image',
    }));
  }, [pendingImages]);

  const getUploadedImages = useCallback((): Array<{
    imageUrl: string;
    altText?: string;
  }> => {
    return pendingImages
      .filter((img) => img.objectName)
      .map((img) => ({
        imageUrl: img.objectName!,
        altText: img.file.name || 'Pasted image',
      }));
  }, [pendingImages]);

  const hasUnuploadedImages = useCallback((): boolean => {
    return pendingImages.some((img) => !img.objectName);
  }, [pendingImages]);

  return {
    pendingImages,
    addImages,
    removeImage,
    setImageObjectName,
    clearImages,
    getImagesForContext,
    getUploadedImages,
    hasUnuploadedImages,
  };
}
