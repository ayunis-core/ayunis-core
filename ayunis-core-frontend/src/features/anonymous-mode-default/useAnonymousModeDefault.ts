import { useCallback, useState } from 'react';

const STORAGE_KEY = 'ayunis:anonymous-mode-default';

function readAnonymousModeDefault(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === 'true';
}

export function useAnonymousModeDefault() {
  const [isAnonymousByDefault, setIsAnonymousByDefault] = useState<boolean>(
    readAnonymousModeDefault,
  );

  const setAnonymousByDefault = useCallback((next: boolean) => {
    setIsAnonymousByDefault(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    }
  }, []);

  return { isAnonymousByDefault, setAnonymousByDefault };
}
