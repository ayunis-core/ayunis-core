import type { QueryClient } from '@tanstack/react-query';
import {
  getReleaseNotesControllerCountUnreadQueryKey,
  getReleaseNotesControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

/** Refreshes the product updates list and the bell's unread dot. */
export function invalidateReleaseNoteQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: getReleaseNotesControllerFindAllQueryKey(),
  });
  void queryClient.invalidateQueries({
    queryKey: getReleaseNotesControllerCountUnreadQueryKey(),
  });
}
