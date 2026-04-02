import { useEffect, useRef, useState, type RefObject } from 'react';

interface UseDragOverOptions {
  containerRef: RefObject<HTMLElement | null>;
  onDrop: (files: FileList) => void;
  disabled?: boolean;
}

interface UseDragOverResult {
  isDragging: boolean;
}

/**
 * Low-level hook that tracks drag-over state on a container element and
 * delivers the raw FileList on drop.  Higher-level hooks (useDocumentDrop,
 * useFileDrop) build on top of this to add file-type validation and routing.
 */
export function useDragOver({
  containerRef,
  onDrop,
  disabled = false,
}: UseDragOverOptions): UseDragOverResult {
  const [isDragging, setIsDragging] = useState(false);
  const [, setDragCounter] = useState(0);

  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

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
      if (files && files.length > 0) {
        onDropRef.current(files);
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
      setIsDragging(false);
      setDragCounter(0);
    };
  }, [containerRef, disabled]);

  return { isDragging };
}
