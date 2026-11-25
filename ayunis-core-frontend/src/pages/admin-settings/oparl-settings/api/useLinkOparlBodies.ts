import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getOparlBodiesControllerListQueryKey,
  oparlBodiesControllerLink,
} from '@ayunis/api-client';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useLinkOparlBodies() {
  const { t } = useTranslation('admin-settings-oparl');
  const queryClient = useQueryClient();
  const invalidate = () =>
    void queryClient.invalidateQueries({
      queryKey: getOparlBodiesControllerListQueryKey(),
    });

  return useMutation({
    mutationFn: async (bodyIds: string[]) => {
      await oparlBodiesControllerLink({ bodyIds });
    },
    onSuccess: (_, bodyIds) => {
      invalidate();
      showSuccess(t('link.success', { count: bodyIds.length }));
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        if (code === 'OPARL_BODY_NOT_FOUND') {
          invalidate();
          showError(t('link.notFound'));
        } else {
          showError(t('link.error'));
        }
      } catch {
        showError(t('link.error'));
      }
    },
  });
}
