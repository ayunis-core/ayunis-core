import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getOparlBodiesControllerListQueryKey,
  oparlBodiesControllerUnlink,
} from '@ayunis/api-client';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useUnlinkOparlBody() {
  const { t } = useTranslation('admin-settings-oparl');
  const queryClient = useQueryClient();
  const invalidate = () =>
    void queryClient.invalidateQueries({
      queryKey: getOparlBodiesControllerListQueryKey(),
    });

  return useMutation({
    mutationFn: async (bodyId: string) => {
      await oparlBodiesControllerUnlink(bodyId);
    },
    onSuccess: () => {
      invalidate();
      showSuccess(t('unlink.success'));
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        if (code === 'OPARL_BODY_NOT_LINKED') {
          invalidate();
          showError(t('unlink.notLinked'));
        } else {
          showError(t('unlink.error'));
        }
      } catch {
        showError(t('unlink.error'));
      }
    },
  });
}
