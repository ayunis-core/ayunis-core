import { useCallback, useState } from 'react';

function readSidebarGroupOpen(storageKey: string): boolean {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem(storageKey);
  return stored === null ? true : stored === 'true';
}

export function useSidebarGroupOpen(storageKey: string) {
  const [isOpen, setIsOpen] = useState<boolean>(() =>
    readSidebarGroupOpen(storageKey),
  );

  const setOpen = useCallback(
    (next: boolean) => {
      setIsOpen(next);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, String(next));
      }
    },
    [storageKey],
  );

  return [isOpen, setOpen] as const;
}
