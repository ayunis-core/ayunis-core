import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getSuperAdminOparlEmbeddingModelControllerGetQueryKey,
  getSuperAdminOparlSystemsControllerListQueryKey,
  useSuperAdminOparlEmbeddingModelControllerSet,
} from '@ayunis/api-client';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useSetOparlEmbeddingModel() {
  const { t } = useTranslation('super-admin-settings-oparl');
  const queryClient = useQueryClient();

  const { mutate, isPending } = useSuperAdminOparlEmbeddingModelControllerSet({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminOparlEmbeddingModelControllerGetQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminOparlSystemsControllerListQueryKey(),
        });
        showSuccess(t('embeddingModel.success'));
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          showError(
            code === 'OPARL_EMBEDDING_MODEL_NOT_FOUND'
              ? t('embeddingModel.notFound')
              : t('embeddingModel.error'),
          );
        } catch {
          showError(t('embeddingModel.error'));
        }
      },
    },
  });

  function setModel(modelId: string) {
    mutate({ data: { modelId } });
  }

  return { setModel, isPending };
}
