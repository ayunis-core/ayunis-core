import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminImageGenerationCatalogModelsControllerCreateImageGenerationModel,
  getSuperAdminCatalogModelsControllerGetAllCatalogModelsQueryKey,
  type CreateImageGenerationModelRequestDto,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

export function useCreateImageGenerationModel(onSuccess?: () => void) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation =
    useSuperAdminImageGenerationCatalogModelsControllerCreateImageGenerationModel(
      {
        mutation: {
          onSuccess: async () => {
            await queryClient.invalidateQueries({
              queryKey:
                getSuperAdminCatalogModelsControllerGetAllCatalogModelsQueryKey(),
            });
            showSuccess(t('models.createSuccess'));
            onSuccess?.();
          },
          onError: (error: unknown) => {
            console.error('Create image generation model failed:', error);
            try {
              const { code } = extractErrorData(error);
              if (code === 'MODEL_ALREADY_EXISTS') {
                showError(t('models.alreadyExists'));
              } else {
                showError(t('models.createError'));
              }
            } catch {
              showError(t('models.createError'));
            }
          },
          onSettled: async () => {
            await router.invalidate();
          },
        },
      },
    );

  function createImageGenerationModel(
    data: CreateImageGenerationModelRequestDto,
  ) {
    mutation.mutate({ data });
  }

  return {
    createImageGenerationModel,
    isCreating: mutation.isPending,
  };
}
