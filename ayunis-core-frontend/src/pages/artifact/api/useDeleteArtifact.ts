import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  artifactsControllerDelete,
  getArtifactsControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { invalidateArtifactLists } from '@/widgets/artifact-panel';

const ERROR_KEYS: Record<string, string> = {
  ARTIFACT_NOT_FOUND: 'delete.notFound',
  UNAUTHORIZED_ACCESS: 'delete.forbidden',
};

/**
 * `onDeleted` leaves the artifact's page; only then is the artifact dropped
 * from the cache, so the page does not refetch it and show it as missing.
 */
export function useDeleteArtifact(onDeleted: () => Promise<void>) {
  const { t } = useTranslation('artifacts');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (artifactId: string) => artifactsControllerDelete(artifactId),
    onSuccess: async (_, artifactId) => {
      showSuccess(t('delete.success'));
      await onDeleted();
      queryClient.removeQueries({
        queryKey: getArtifactsControllerFindOneQueryKey(artifactId),
      });
      invalidateArtifactLists(queryClient);
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
