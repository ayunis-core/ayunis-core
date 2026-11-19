import {
  getReleaseNotesControllerCountUnreadQueryKey,
  useReleaseNotesControllerCountUnread,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useIsFeatureEnabled } from '@/features/feature-toggles';

/** Release notes are synced in the background, so the count is polled. */
const UNREAD_COUNT_REFETCH_INTERVAL_MS = 5 * 60_000;

export function useUnreadReleaseNoteCount() {
  const enabled = useIsFeatureEnabled('releaseNotesEnabled');
  const { data } = useReleaseNotesControllerCountUnread({
    query: {
      queryKey: getReleaseNotesControllerCountUnreadQueryKey(),
      enabled,
      refetchInterval: UNREAD_COUNT_REFETCH_INTERVAL_MS,
    },
  });
  return { unreadCount: enabled ? (data?.count ?? 0) : 0 };
}
