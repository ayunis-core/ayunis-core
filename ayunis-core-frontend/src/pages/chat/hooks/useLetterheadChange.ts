import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateArtifact } from '../api/useUpdateArtifact';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

interface UseLetterheadChangeOptions {
  artifactId: string;
  threadId: string;
}

export function useLetterheadChange({
  artifactId,
  threadId,
}: UseLetterheadChangeOptions) {
  const { t } = useTranslation('artifacts');

  const { updateArtifact } = useUpdateArtifact({
    artifactId,
    threadId,
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'LETTERHEAD_NOT_FOUND':
            showError(t('letterhead.notFound'));
            break;
          case 'ARTIFACT_NOT_FOUND':
            showError(t('letterhead.documentNotFound'));
            break;
          default:
            showError(t('letterhead.changeError'));
        }
      } catch {
        showError(t('letterhead.changeError'));
      }
    },
  });

  const handleLetterheadChange = useCallback(
    (letterheadId: string | null) => {
      updateArtifact({ letterheadId });
    },
    [updateArtifact],
  );

  return { handleLetterheadChange };
}
