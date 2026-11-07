import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getRoutinesControllerFindAllQueryKey,
  routinesControllerDelete,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useDeleteRoutine() {
  const { t } = useTranslation('routines');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await routinesControllerDelete(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getRoutinesControllerFindAllQueryKey(),
      });
      showSuccess(t('toast.deleteSuccess'));
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(
          code === 'ROUTINE_NOT_FOUND'
            ? t('toast.notFound')
            : t('toast.deleteError'),
        );
      } catch {
        showError(t('toast.deleteError'));
      }
    },
  });
}
