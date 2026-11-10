import { useCallback } from 'react';
import { useMarkNotificationRead } from '@/features/notifications';
import { useReadOverrides } from '@/shared/lib/prototype-settings';

const SAMPLE_PREFIXES = ['sample', 'arrival', 'task'];

function isSampleId(id: string) {
  return SAMPLE_PREFIXES.some((prefix) => id.startsWith(prefix));
}

export function useReadToggle() {
  const { resolveUnread, setUnread } = useReadOverrides();
  const { mutate: markRead } = useMarkNotificationRead();

  const setRead = useCallback(
    (id: string, isRead: boolean) => {
      setUnread(id, !isRead);
      if (isRead && !isSampleId(id)) markRead(id);
    },
    [setUnread, markRead],
  );

  return { resolveUnread, setRead };
}
