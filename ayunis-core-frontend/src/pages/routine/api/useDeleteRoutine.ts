import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getRoutinesControllerFindAllQueryKey,
  getRoutinesControllerFindOneQueryKey,
  routinesControllerDelete,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useDeleteRoutine() {
  const { t } = useTranslation('routines');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (id: string) => {
      await routinesControllerDelete(id);
    },
    onSuccess: async (_, id) => {
      void queryClient.invalidateQueries({
        queryKey: getRoutinesControllerFindAllQueryKey(),
      });
      showSuccess(t('toast.deleteSuccess'));
      await navigate({ to: '/routines' });
      // Only once the page stopped polling it, so going back cannot show the
      // deleted routine from the cache.
      queryClient.removeQueries({
        queryKey: getRoutinesControllerFindOneQueryKey(id),
      });
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
