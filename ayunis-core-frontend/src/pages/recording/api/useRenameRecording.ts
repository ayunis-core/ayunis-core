import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getRecordingsControllerFindAllQueryKey,
  getRecordingsControllerFindOneQueryKey,
  recordingsControllerRename,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

const ERROR_KEYS: Record<string, string> = {
  RECORDING_NOT_FOUND: 'detail.rename.notFound',
  UNAUTHORIZED_ACCESS: 'detail.rename.noPermission',
  VALIDATION_ERROR: 'detail.rename.validationError',
};

export function useRenameRecording(recordingId: string) {
  const { t } = useTranslation('recordings');
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (data: { name: string }) =>
      recordingsControllerRename(recordingId, data),
    onSuccess: async () => {
      await Promise.all(
        [
          getRecordingsControllerFindAllQueryKey(),
          getRecordingsControllerFindOneQueryKey(recordingId),
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
      await router.invalidate();
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(t(ERROR_KEYS[code] ?? 'detail.rename.error'));
      } catch {
        showError(t('detail.rename.error'));
      }
    },
  });

  return { renameRecording: mutation.mutateAsync };
}
