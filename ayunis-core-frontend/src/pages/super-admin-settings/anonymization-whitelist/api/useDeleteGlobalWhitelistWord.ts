import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useSuperAdminAnonymizationWhitelistControllerRemove,
  getSuperAdminAnonymizationWhitelistControllerListQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showSuccess, showError } from '@/shared/lib/toast';

export function useDeleteGlobalWhitelistWord() {
  const { t } = useTranslation('super-admin-settings-anonymization');
  const queryClient = useQueryClient();

  const mutation = useSuperAdminAnonymizationWhitelistControllerRemove({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminAnonymizationWhitelistControllerListQueryKey(),
        });
        showSuccess(t('delete.success'));
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'GLOBAL_WHITELIST_WORD_NOT_FOUND') {
            // The word is gone on the server — refresh so the stale row
            // disappears from the list too.
            void queryClient.invalidateQueries({
              queryKey:
                getSuperAdminAnonymizationWhitelistControllerListQueryKey(),
            });
            showError(t('delete.notFound'));
          } else {
            showError(t('delete.error'));
          }
        } catch {
          showError(t('delete.error'));
        }
      },
    },
  });

  function deleteWord(wordId: string) {
    mutation.mutate({ wordId });
  }

  return { deleteWord, isPending: mutation.isPending };
}
