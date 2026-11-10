import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PlinthSection } from '@/pages/new-chat/model/plinth-sections';

const BUMP_MS = 1600;

export function useArrivalBumps(sections: PlinthSection[]): Set<string> {
  const previous = useRef<Map<string, number> | null>(null);
  const [bumped, setBumped] = useState<Set<string>>(() => new Set());

  const signature = sections
    .map((section) => `${section.id}:${section.count}`)
    .join('|');

  useEffect(() => {
    const counts = new Map(
      signature
        .split('|')
        .filter(Boolean)
        .map((entry) => {
          const [id, count] = entry.split(':');
          return [id, Number(count)] as const;
        }),
    );
    const before = previous.current;
    previous.current = counts;
    if (!before) return;
    const grown = [...counts]
      .filter(([id, count]) => count > (before.get(id) ?? 0))
      .map(([id]) => id);
    if (grown.length === 0) return;
    setBumped(new Set(grown));
    const timer = window.setTimeout(() => setBumped(new Set()), BUMP_MS);
    return () => window.clearTimeout(timer);
  }, [signature]);

  return bumped;
}

export function useSlidingIndicator(activeId: string | null) {
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const element = activeId ? chipRefs.current.get(activeId) : undefined;
    if (!element) {
      setBox(null);
      return;
    }
    const measure = () =>
      setBox({ left: element.offsetLeft, width: element.offsetWidth });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [activeId]);

  function registerChip(id: string) {
    return (element: HTMLButtonElement | null) => {
      if (element) chipRefs.current.set(id, element);
      else chipRefs.current.delete(id);
    };
  }

  return { box, registerChip };
}
