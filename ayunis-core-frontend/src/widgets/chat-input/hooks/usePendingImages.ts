import { useState, useCallback } from 'react';

export interface PendingImage {
  id: string;
  file: File;
  preview: string;
  objectName?: string;
}

export const MAX_IMAGES = 8;

export function usePendingImages() {
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);

  const addImage = useCallback(
    (file: File): PendingImage | null => {
      if (pendingImages.length >= MAX_IMAGES) {
        return null;
      }

      // eslint-disable-next-line sonarjs/pseudo-random -- Unique ID for UI tracking, not security-sensitive
      const id = `${Date.now()}-${Math.random()}`;
      const preview = URL.createObjectURL(file);
      const image: PendingImage = { id, file, preview };
      setPendingImages((prev) => [...prev, image]);

      return image;
    },
    [pendingImages.length],
  );

  const addImages = useCallback(
    (files: File[]): { added: number; limitExceeded: boolean } => {
      const currentCount = pendingImages.length;
      const remainingSlots = MAX_IMAGES - currentCount;

      if (remainingSlots <= 0) {
        return { added: 0, limitExceeded: true };
      }

      const filesToAdd = files.slice(0, remainingSlots);
      const newImages = filesToAdd.map((file) => {
        // eslint-disable-next-line sonarjs/pseudo-random -- Unique ID for UI tracking, not security-sensitive
        const id = `${Date.now()}-${Math.random()}`;
        const preview = URL.createObjectURL(file);

        return { id, file, preview };
      });

      setPendingImages((prev) => [...prev, ...newImages]);

      return {
        added: newImages.length,
        limitExceeded: files.length > remainingSlots,
      };
    },
    [pendingImages.length],
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
    addImage,
    addImages,
    removeImage,
    setImageObjectName,
    clearImages,
    getImagesForContext,
    getUploadedImages,
    hasUnuploadedImages,
  };
}
