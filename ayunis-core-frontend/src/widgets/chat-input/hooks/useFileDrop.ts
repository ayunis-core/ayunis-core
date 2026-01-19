import { useCallback, useEffect, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { separateFilesByType } from '../utils/fileHandlers';

interface UseFileDropOptions {
  containerRef: RefObject<HTMLElement | null>;
  onDocumentDrop: (file: File) => void;
  onImagesDrop: (files: File[]) => void;
  isDocumentUploadEnabled: boolean;
  isImageUploadEnabled: boolean;
  acceptedDocumentExtensions: string[];
}

interface UseFileDropResult {
  isDragging: boolean;
}

export function useFileDrop({
  containerRef,
  onDocumentDrop,
  onImagesDrop,
  isDocumentUploadEnabled,
  isImageUploadEnabled,
  acceptedDocumentExtensions,
}: UseFileDropOptions): UseFileDropResult {
  const { t } = useTranslation('common');
  const [isDragging, setIsDragging] = useState(false);
  const [, setDragCounter] = useState(0);

  const isValidDocumentFile = useCallback(
    (file: File): boolean => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return acceptedDocumentExtensions.includes(extension);
    },
    [acceptedDocumentExtensions],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((prev) => prev + 1);
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((prev) => {
        const newCount = prev - 1;
        if (newCount === 0) {
          setIsDragging(false);
        }
        return newCount;
      });
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const { images, regularFiles } = separateFilesByType(files);
      let hasSkippedFiles = false;

      // Handle images
      if (isImageUploadEnabled && images.length > 0) {
        onImagesDrop(images);
      } else if (!isImageUploadEnabled && images.length > 0) {
        // If image upload is disabled but images were dropped
        hasSkippedFiles = true;
      }

      // Handle documents (only first one, as per existing behavior)
      if (isDocumentUploadEnabled && regularFiles.length > 0) {
        const validDocuments = regularFiles.filter(isValidDocumentFile);
        if (validDocuments.length > 0) {
          onDocumentDrop(validDocuments[0]);
        }
        // Check if any documents were skipped due to invalid file type
        if (validDocuments.length < regularFiles.length) {
          hasSkippedFiles = true;
        }
      } else if (!isDocumentUploadEnabled && regularFiles.length > 0) {
        // If document upload is disabled but documents were dropped
        hasSkippedFiles = true;
      }

      // Show toast if any files were skipped
      if (hasSkippedFiles) {
        toast.error(t('chatInput.invalidDroppedFileType'));
      }
    };

    container.addEventListener('dragenter', handleDragEnter);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('dragenter', handleDragEnter);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
    };
  }, [
    containerRef,
    onDocumentDrop,
    onImagesDrop,
    isDocumentUploadEnabled,
    isImageUploadEnabled,
    isValidDocumentFile,
    t,
  ]);

  return { isDragging };
}
