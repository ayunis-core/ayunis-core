import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { artifactsControllerConvertToNormal } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { invalidateArtifactQueries } from './invalidateArtifactQueries';

const ERROR_KEYS: Record<string, string> = {
  ARTIFACT_NOT_FOUND: 'conversion.notFound',
  UNAUTHORIZED_ACCESS: 'conversion.forbidden',
  ARTIFACT_VERSION_CONFLICT: 'conversion.conflict',
};

export function useConvertArtifactToNormal() {
  const { t } = useTranslation('artifacts');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (artifactId: string) =>
      artifactsControllerConvertToNormal(artifactId),
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(t(ERROR_KEYS[code] ?? 'conversion.error'));
      } catch {
        showError(t('conversion.error'));
      }
    },
    onSettled: (_, __, artifactId) =>
      invalidateArtifactQueries(queryClient, artifactId),
  });
}
