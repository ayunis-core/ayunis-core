import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

/**
 * Measures how far the bottom-anchored compose block must be lifted so it
 * appears vertically centered in the stage while idle. Re-measures on resize
 * of either element; frozen while settling so the slide-down transition runs
 * from the last idle position.
 */
export function useComposeLift(enabled: boolean, isSettling: boolean) {
  const stageRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLDivElement>(null);
  const [liftPx, setLiftPx] = useState(0);

  const measureLift = useCallback(() => {
    if (isSettling) return;

    const stage = stageRef.current;
    const block = composeRef.current;
    if (!stage || !block) return;

    const lift = -((stage.clientHeight - block.offsetHeight) / 2);
    const nextLift = Math.round(lift);

    setLiftPx((prev) => {
      if (prev === nextLift) return prev;
      // Ignore sub-pixel layout churn (textarea autosize, fonts) while idle
      if (prev !== 0 && Math.abs(prev - nextLift) <= 2) return prev;
      return nextLift;
    });
  }, [isSettling]);

  useLayoutEffect(() => {
    if (!enabled || isSettling) return;
    measureLift();
  }, [enabled, measureLift, isSettling]);

  useEffect(() => {
    if (!enabled) return;

    const stage = stageRef.current;
    const block = composeRef.current;
    if (!stage || !block) return;

    const observer = new ResizeObserver(() => {
      measureLift();
    });
    observer.observe(stage);
    observer.observe(block);

    return () => {
      observer.disconnect();
    };
  }, [enabled, measureLift]);

  return { stageRef, composeRef, liftPx };
}
