import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getRoutinesControllerFindAllQueryKey,
  routinesControllerRunNow,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useRunRoutineNow() {
  const { t } = useTranslation('routines');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await routinesControllerRunNow(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getRoutinesControllerFindAllQueryKey(),
      });
      showSuccess(t('toast.runStarted'));
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'ROUTINE_NOT_FOUND':
            showError(t('toast.notFound'));
            break;
          case 'SUBSCRIPTION_REQUIRED':
            showError(t('toast.subscriptionRequired'));
            break;
          default:
            showError(t('toast.runError'));
        }
      } catch {
        showError(t('toast.runError'));
      }
    },
  });
}
