import { useCallback, useState } from 'react';

const STORAGE_KEY = 'sidebar_show_routine_chats';

function readShowRoutineThreads(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(STORAGE_KEY) !== 'false';
}

/** Routine threads are listed unless the user hid them; the choice persists. */
export function useShowRoutineThreads() {
  const [show, setShowState] = useState<boolean>(readShowRoutineThreads);

  const setShow = useCallback((next: boolean) => {
    setShowState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    }
  }, []);

  return [show, setShow] as const;
}
