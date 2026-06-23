import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './prefersReducedMotion';

export function useCountUp(
  target: number,
  active = true,
  startDelayMs = 0,
  durationMs = 1800,
): number {
  const reduced = prefersReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const started = useRef(false);
  const frame = useRef<number>(0);
  const timer = useRef<number>(0);

  useEffect(() => {
    if (reduced || !active || started.current) {
      return;
    }
    timer.current = window.setTimeout(() => {
      started.current = true;
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

  return value;
}
