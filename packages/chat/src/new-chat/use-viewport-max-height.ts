import { useLayoutEffect, useRef, useState } from 'react';

const BOTTOM_GAP = 24;
const MAX_HEIGHT = 420;

export function useViewportMaxHeight(isOpen: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState(MAX_HEIGHT);

  useLayoutEffect(() => {
    if (!isOpen) return;
    function measure() {
      const element = ref.current;
      if (!element) return;
      const available =
        window.innerHeight - element.getBoundingClientRect().top - BOTTOM_GAP;
      setMaxHeight(Math.max(0, Math.min(available, MAX_HEIGHT)));
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isOpen]);

  return { ref, maxHeight };
}
