import { useCallback, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';
import { useDragOver } from './useDragOver';

interface UseDocumentDropOptions {
  containerRef: RefObject<HTMLElement | null>;
  onDrop: (file: File) => void;
  acceptedExtensions: string[];
  disabled?: boolean;
}

interface UseDocumentDropResult {
  isDragging: boolean;
}

export function useDocumentDrop({
  containerRef,
  onDrop,
  acceptedExtensions,
  disabled = false,
}: UseDocumentDropOptions): UseDocumentDropResult {
  const { t } = useTranslation('common');

  const isValidFile = useCallback(
    (file: File): boolean => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return acceptedExtensions.includes(extension);
    },
    [acceptedExtensions],
  );

  const handleDrop = useCallback(
    (files: FileList) => {
      const validFiles = Array.from(files).filter(isValidFile);
      if (validFiles.length === 0) {
        showError(t('chatInput.invalidDroppedFileType'));
        return;
      }

      if (validFiles.length < files.length) {
        showError(t('chatInput.invalidDroppedFileType'));
      }

      onDrop(validFiles[0]);
    },
    [isValidFile, onDrop, t],
  );

  const { isDragging } = useDragOver({
    containerRef,
    onDrop: handleDrop,
    disabled,
  });

  return { isDragging };
}
