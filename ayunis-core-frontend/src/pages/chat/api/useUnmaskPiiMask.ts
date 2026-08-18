import {
  useThreadsControllerUnmaskPiiMask,
  getThreadsControllerFindOneQueryKey,
} from '@/shared/api';
import type { PiiMaskResponseDto } from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

interface UseUnmaskPiiMaskProps {
  threadId: string;
  onSuccess?: (masks: PiiMaskResponseDto[]) => void;
}

export function useUnmaskPiiMask({
  threadId,
  onSuccess,
}: UseUnmaskPiiMaskProps) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('chat');
  const unmaskMutation = useThreadsControllerUnmaskPiiMask({
    mutation: {
      onSuccess: (masks) => {
        onSuccess?.(masks);
        void queryClient.invalidateQueries({
          queryKey: getThreadsControllerFindOneQueryKey(threadId),
        });
        showSuccess(t('chat.piiMask.unmaskSuccess'));
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'THREAD_PII_MASK_NOT_FOUND') {
            showError(t('chat.piiMask.unmaskNotFound'));
          } else {
            showError(t('chat.piiMask.unmaskError'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('chat.piiMask.unmaskError'));
        }
      },
    },
  });

  const unmaskPiiMask = (maskId: string) => {
    unmaskMutation.mutate({ id: threadId, maskId });
  };

  return {
    unmaskPiiMask,
    isLoading: unmaskMutation.isPending,
  };
}
