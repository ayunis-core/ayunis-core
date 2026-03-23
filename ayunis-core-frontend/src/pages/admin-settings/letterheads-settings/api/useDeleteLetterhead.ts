import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import {
  useLetterheadsControllerRemove,
  getLetterheadsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useDeleteLetterhead(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-letterheads');

  const mutation = useLetterheadsControllerRemove({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getLetterheadsControllerFindAllQueryKey(),
        });
        showSuccess(t('letterheads.deleteDialog.success'));
        onSuccess?.();
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'LETTERHEAD_NOT_FOUND') {
            showError(t('letterheads.deleteDialog.notFound'));
            return;
          }

          showError(t('letterheads.deleteDialog.error'));
        } catch {
          showError(t('letterheads.deleteDialog.error'));
        }
      },
    },
  });

  return {
    deleteLetterhead: (id: string) => mutation.mutate({ id }),
    isDeleting: mutation.isPending,
  };
}
