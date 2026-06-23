import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

export function useCountUp(
  target: number,
  active = true,
  startDelayMs = 0,
  durationMs = 1800,
): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const frame = useRef<number>(0);
  const timer = useRef<number>(0);

  useEffect(() => {
    if (reduced || !active) {
      return;
    }
    timer.current = window.setTimeout(() => {
      setValue(0);
      let start: number | null = null;
      const tick = (now: number) => {
        start ??= now;
        const progress = Math.min((now - start) / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased));
        if (progress < 1) {
          frame.current = requestAnimationFrame(tick);
        }
      };
      frame.current = requestAnimationFrame(tick);
    }, startDelayMs);

    return () => {
      window.clearTimeout(timer.current);
      cancelAnimationFrame(frame.current);
    };
  }, [active, reduced, target, startDelayMs, durationMs]);

  return reduced ? target : value;
}
