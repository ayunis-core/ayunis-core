import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';
import {
  useSuperAdminAcademyChaptersControllerReorderChapters,
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';

export function useReorderChapters() {
  const { t } = useTranslation('super-admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminAcademyChaptersControllerReorderChapters({
    mutation: {
      // Serialize reorder requests so a slower earlier request cannot finish
      // after a newer one and overwrite the latest order on the server.
      scope: { id: 'reorder-academy-chapters' },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
        });
      },
      onError: (error: unknown) => {
        // All backend error codes (INVALID_REORDER, unexpected) map to the
        // same user feedback — the list silently snaps back to server order.
        try {
          extractErrorData(error);
          showError(t('toast.reorderError'));
        } catch {
          showError(t('toast.reorderError'));
        }
        // Re-sync the optimistic local order with the server state
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
        });
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function reorderChapters(chapterIds: string[]) {
    mutation.mutate({ data: { chapterIds } });
  }

  return {
    reorderChapters,
    isReordering: mutation.isPending,
  };
}
