import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { releaseNotesControllerMarkAllRead } from '@ayunis/api-client/endpoints';
import { invalidateReleaseNoteQueries } from '@/features/release-notes';
import { showError } from '@/shared/lib/toast';

export function useMarkAllReleaseNotesRead() {
  const { t } = useTranslation('release-notes');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await releaseNotesControllerMarkAllRead();
    },
    onSuccess: () => {
      invalidateReleaseNoteQueries(queryClient);
    },
    // The endpoint has no error codes of its own to tell apart.
    onError: () => {
      showError(t('page.markAllReadError'));
    },
  });
}
