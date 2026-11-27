import { useCallback, useState } from 'react';

const STORAGE_KEY = 'advent_calendar_effects';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function readEffectsOn(): boolean {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'on' || stored === 'off') return stored === 'on';
  } catch {
    // Without browser storage the system setting decides.
  }
  return !window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function useAdventEffects() {
  const [effectsOn, setEffectsOnState] = useState(readEffectsOn);

  const setEffectsOn = useCallback((on: boolean) => {
    setEffectsOnState(on);
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    } catch {
      // The switch still works for this visit.
    }
  }, []);

  return { effectsOn, setEffectsOn };
}
