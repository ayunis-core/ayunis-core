import { useCallback, useState } from 'react';

// Opened doors are remembered only in this browser; the server stores nothing
// per user. The season year keeps next year's doors closed.
function storageKey(seasonYear: number, day: number): string {
  return `advent_calendar_opened:${seasonYear}:${day}`;
}

export function isAdventDoorOpened(seasonYear: number, day: number): boolean {
  try {
    return window.localStorage.getItem(storageKey(seasonYear, day)) !== null;
  } catch {
    return false;
  }
}

function markAdventDoorOpened(seasonYear: number, day: number): void {
  try {
    window.localStorage.setItem(storageKey(seasonYear, day), '1');
  } catch {
    // The calendar must stay usable when browser storage is unavailable.
  }
}

export function useOpenedAdventDoors(seasonYear: number) {
  // Re-renders the caller after a door is marked, so it reads storage again.
  const [, setVersion] = useState(0);

  const isOpened = (day: number) => isAdventDoorOpened(seasonYear, day);

  const markOpened = useCallback(
    (day: number) => {
      if (isAdventDoorOpened(seasonYear, day)) return;
      markAdventDoorOpened(seasonYear, day);
      setVersion((version) => version + 1);
    },
    [seasonYear],
  );

  return { isOpened, markOpened };
}
