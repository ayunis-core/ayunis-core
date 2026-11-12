import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getRecordingsControllerFindOneQueryKey,
  recordingSummaryControllerRetry,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

const ERROR_KEYS: Record<string, string> = {
  RECORDING_NOT_FOUND: 'detail.summary.retryNotFound',
  RECORDING_SUMMARY_NOT_RETRYABLE: 'detail.summary.retryNotRetryable',
  UNAUTHORIZED_ACCESS: 'detail.summary.retryNoPermission',
};

/** "Try again" on a failed summary; the recording then shows it summarizing. */
export function useRetryRecordingSummary(recordingId: string) {
  const { t } = useTranslation('recordings');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => recordingSummaryControllerRetry(recordingId),
    onSuccess: (recording) => {
      queryClient.setQueryData(
        getRecordingsControllerFindOneQueryKey(recordingId),
        recording,
      );
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(t(ERROR_KEYS[code] ?? 'detail.summary.retryError'));
      } catch {
        showError(t('detail.summary.retryError'));
      }
    },
  });
}
