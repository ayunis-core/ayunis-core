import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getRecordingsControllerFindAllQueryKey,
  recordingsControllerDelete,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

const ERROR_KEYS: Record<string, string> = {
  RECORDING_NOT_FOUND: 'delete.notFound',
  UNAUTHORIZED_ACCESS: 'delete.noPermission',
};

export function useDeleteRecording(onSuccess?: () => void) {
  const { t } = useTranslation('recordings');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (id: string) => recordingsControllerDelete(id),
    onSuccess: () => {
      // Both the personal and the workspace lists may hold it.
      void queryClient.invalidateQueries({
        queryKey: getRecordingsControllerFindAllQueryKey(),
      });
      showSuccess(t('delete.success'));
      // Reloading the page of a deleted recording would fail; leave it instead.
      if (onSuccess) onSuccess();
      else void router.invalidate();
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(t(ERROR_KEYS[code] ?? 'delete.error'));
      } catch {
        showError(t('delete.error'));
      }
    },
  });
}
