import { useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

export function useAutoRotate(count: number, intervalMs = 10500) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (count <= 1 || reduced) {
      return;
    }
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, intervalMs);
    return () => clearInterval(id);
  }, [count, intervalMs, reduced]);

  return { index };
}
