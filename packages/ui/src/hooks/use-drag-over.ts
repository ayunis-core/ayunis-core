import { useEffect, useRef, useState, type RefObject } from 'react';

interface UseDragOverOptions {
  containerRef: RefObject<HTMLElement | null>;
  onDrop: (files: FileList) => void;
  disabled?: boolean;
}

export function useDragOver({
  containerRef,
  onDrop,
  disabled = false,
}: UseDragOverOptions): { isDragging: boolean } {
  const [isDragging, setIsDragging] = useState(false);
  const onDropRef = useRef(onDrop);
  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;
    const unsubscribe = subscribeDragEvents(container, setIsDragging, (files) =>
      onDropRef.current(files),
    );
    return () => {
      unsubscribe();
      setIsDragging(false);
    };
  }, [containerRef, disabled]);

  return { isDragging };
}

function stopDragEvent(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
}

function subscribeDragEvents(
  container: HTMLElement,
  setIsDragging: (dragging: boolean) => void,
  onDrop: (files: FileList) => void,
) {
  let depth = 0;
  const handlers = {
    dragenter: (event: DragEvent) => {
      stopDragEvent(event);
      depth += 1;
      setIsDragging(true);
    },
    dragleave: (event: DragEvent) => {
      stopDragEvent(event);
      depth = Math.max(0, depth - 1);
      if (depth === 0) setIsDragging(false);
    },
    dragover: stopDragEvent,
    drop: (event: DragEvent) => {
      stopDragEvent(event);
      depth = 0;
      setIsDragging(false);
      const files = event.dataTransfer?.files;
      if (files?.length) onDrop(files);
    },
  };

  const events = ['dragenter', 'dragleave', 'dragover', 'drop'] as const;
  events.forEach((event) => container.addEventListener(event, handlers[event]));
  return () => {
    events.forEach((event) =>
      container.removeEventListener(event, handlers[event]),
    );
  };
}
