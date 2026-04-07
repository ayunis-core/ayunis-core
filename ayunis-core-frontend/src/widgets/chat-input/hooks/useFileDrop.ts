import { useCallback, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';
import { useDragOver } from '@/shared/hooks/useDragOver';
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

  const isValidDocumentFile = useCallback(
    (file: File): boolean => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return acceptedDocumentExtensions.includes(extension);
    },
    [acceptedDocumentExtensions],
  );

  const handleDrop = useCallback(
    (files: FileList) => {
      const { images, regularFiles } = separateFilesByType(files);
      let hasSkippedFiles = false;

      if (isImageUploadEnabled && images.length > 0) {
        onImagesDrop(images);
      } else if (!isImageUploadEnabled && images.length > 0) {
        hasSkippedFiles = true;
      }

      if (isDocumentUploadEnabled && regularFiles.length > 0) {
        const validDocuments = regularFiles.filter(isValidDocumentFile);
        if (validDocuments.length > 0) {
          onDocumentDrop(validDocuments[0]);
        }
        if (validDocuments.length < regularFiles.length) {
          hasSkippedFiles = true;
        }
      } else if (!isDocumentUploadEnabled && regularFiles.length > 0) {
        hasSkippedFiles = true;
      }

      if (hasSkippedFiles) {
        showError(t('chatInput.invalidDroppedFileType'));
      }
    },
    [
      onDocumentDrop,
      onImagesDrop,
      isDocumentUploadEnabled,
      isImageUploadEnabled,
      isValidDocumentFile,
      t,
    ],
  );

  const { isDragging } = useDragOver({
    containerRef,
    onDrop: handleDrop,
  });

  return { isDragging };
}
