import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getReleaseNotesControllerFindOneQueryKey,
  releaseNotesControllerMarkRead,
} from '@/shared/api/generated/ayunisCoreAPI';
import { invalidateReleaseNoteQueries } from './invalidateReleaseNoteQueries';

/**
 * Runs when an update is opened, not on a user action, so a failure stays
 * silent: the update is simply still unread next time.
 */
export function useMarkReleaseNoteRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (releaseNoteId: string) =>
      releaseNotesControllerMarkRead(releaseNoteId),
    onSuccess: (releaseNote) => {
      queryClient.setQueryData(
        getReleaseNotesControllerFindOneQueryKey(releaseNote.id),
        releaseNote,
      );
      invalidateReleaseNoteQueries(queryClient);
    },
  });
}
