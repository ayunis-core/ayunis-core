import { useEffect, useRef, useState } from 'react';

const CLOSE_DELAY_MS = 150;

export function useHoverCard<T>() {
  const [hovered, setHovered] = useState<T | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const cancelClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(
      () => setHovered(null),
      CLOSE_DELAY_MS,
    );
  };

  const show = (item: T) => {
    cancelClose();
    setHovered(item);
  };

  useEffect(() => cancelClose, []);

  return { hovered, show, scheduleClose, cancelClose };
}
