import { useCallback, useEffect, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';

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
  const [isDragging, setIsDragging] = useState(false);
  const [, setDragCounter] = useState(0);

  const isValidFile = useCallback(
    (file: File): boolean => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return acceptedExtensions.includes(extension);
    },
    [acceptedExtensions],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

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

      const validFiles = Array.from(files).filter(isValidFile);
      if (validFiles.length === 0) {
        showError(t('chatInput.invalidDroppedFileType'));
        return;
      }

      if (validFiles.length < files.length) {
        showError(t('chatInput.invalidDroppedFileType'));
      }

      onDrop(validFiles[0]);
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
  }, [containerRef, onDrop, disabled, isValidFile, t]);

  return { isDragging };
}
