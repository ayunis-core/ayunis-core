import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getReleaseNotesControllerCountUnreadQueryKey,
  getReleaseNotesControllerFindAllQueryKey,
  useReleaseNotesControllerFindAll,
} from '@ayunis/api-client/endpoints';

/** The newest ones; the panel links to the product updates page for the rest. */
const UNREAD_RELEASE_NOTES_LIMIT = 20;

/**
 * The list endpoint is unfiltered, so the unread ones are picked here; every
 * change refreshes the tab count, which is polled separately.
 */
export function useUnreadReleaseNotes() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useReleaseNotesControllerFindAll({
    query: {
      queryKey: getReleaseNotesControllerFindAllQueryKey(),
      // The count polls while the tab is closed, so a reopened tab refetches
      // instead of showing a cached list that no longer matches.
      staleTime: 0,
    },
  });

  useEffect(() => {
    if (!data) return;
    void queryClient.invalidateQueries({
      queryKey: getReleaseNotesControllerCountUnreadQueryKey(),
    });
  }, [data, queryClient]);

  const releaseNotes = useMemo(
    () =>
      (data ?? [])
        .filter((releaseNote) => releaseNote.unread)
        .slice(0, UNREAD_RELEASE_NOTES_LIMIT),
    [data],
  );

  return { releaseNotes, isLoading };
}
