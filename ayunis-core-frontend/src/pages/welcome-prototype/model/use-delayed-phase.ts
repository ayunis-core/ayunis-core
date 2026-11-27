import { useEffect, useState } from 'react';

const IMMEDIATE = (update: () => void) => update();

export function useDelayedPhase<T extends string, I extends string>(
  steps: ReadonlyArray<readonly [T, number]>,
  initial: I,
  running = true,
  wrap: (update: () => void) => void = IMMEDIATE,
) {
  const [phase, setPhase] = useState<T | I>(initial);

  useEffect(() => {
    if (!running) return;
    const ids = steps.map(([value, ms]) =>
      window.setTimeout(() => wrap(() => setPhase(value)), ms),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [running, steps, wrap]);

  return phase;
}
