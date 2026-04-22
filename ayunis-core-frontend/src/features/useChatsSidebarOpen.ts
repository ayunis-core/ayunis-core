import { useCallback, useState } from 'react';

const CHATS_SIDEBAR_OPEN_KEY = 'sidebar_chats_open';

function readChatsSidebarOpen(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem(CHATS_SIDEBAR_OPEN_KEY);
  return stored === null ? true : stored === 'true';
}

export function useChatsSidebarOpen() {
  const [isOpen, setIsOpen] = useState<boolean>(() => readChatsSidebarOpen());

  const setOpen = useCallback((next: boolean) => {
    setIsOpen(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CHATS_SIDEBAR_OPEN_KEY, String(next));
    }
  }, []);

  return [isOpen, setOpen] as const;
}
