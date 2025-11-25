// Types
import type { PendingImage } from './usePendingImages';

// Utils
import { useEffect, useRef } from 'react';

// API
import { useUploadImage } from '@/pages/chat/api/useUploadImage';

interface UseAutoUploadImagesOptions {
  pendingImages: PendingImage[];
  threadId?: string;
  onImageUploaded: (imageId: string, objectName: string) => void;
}

export function useAutoUploadImages({
  pendingImages,
  threadId,
  onImageUploaded,
}: UseAutoUploadImagesOptions): boolean {
  const { uploadImage, isUploading } = useUploadImage(threadId);
  const uploadingRef = useRef<Set<string>>(new Set());
  const onImageUploadedRef = useRef(onImageUploaded);

  // Keep callback ref up to date
  useEffect(() => {
    onImageUploadedRef.current = onImageUploaded;
  }, [onImageUploaded]);

  useEffect(() => {
    if (!threadId) return;

    const imagesToUpload = pendingImages.filter(
      (img) => !img.objectName && !uploadingRef.current.has(img.id),
    );

    if (imagesToUpload.length === 0) return;

    const uploadImages = async () => {
      for (const image of imagesToUpload) {
        // Mark as uploading to prevent duplicate uploads
        uploadingRef.current.add(image.id);

        try {
          const objectName = await uploadImage(image.file);
          uploadingRef.current.delete(image.id);
          onImageUploadedRef.current(image.id, objectName);
        } catch (error) {
          uploadingRef.current.delete(image.id);
          console.error('Failed to upload image:', { id: image.id, error });
        }
      }
    };

    void uploadImages();
  }, [pendingImages, threadId, uploadImage]);

  const hasUnuploadedImages = pendingImages.some((img) => !img.objectName);

  return threadId ? isUploading || hasUnuploadedImages : false;
}
