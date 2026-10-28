import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminImageGenerationCatalogModelsControllerUpdateImageGenerationModel,
  getSuperAdminCatalogModelsControllerGetAllCatalogModelsQueryKey,
  type UpdateImageGenerationModelRequestDto,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import { resolveModelErrorToastKey } from '../lib/resolveModelErrorToastKey';

export function useUpdateImageGenerationModel(onSuccess?: () => void) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation =
    useSuperAdminImageGenerationCatalogModelsControllerUpdateImageGenerationModel(
      {
        mutation: {
          onSuccess: async () => {
            await queryClient.invalidateQueries({
              queryKey:
                getSuperAdminCatalogModelsControllerGetAllCatalogModelsQueryKey(),
            });
            showSuccess(t('models.updateSuccess'));
            onSuccess?.();
          },
          onError: (error: unknown) => {
            console.error('Update image generation model failed:', error);
            try {
              const { code } = extractErrorData(error);
              showError(
                t(resolveModelErrorToastKey(code, 'models.updateError')),
              );
            } catch {
              showError(t('models.updateError'));
            }
          },
          onSettled: async () => {
            await router.invalidate();
          },
        },
      },
    );

  function updateImageGenerationModel(
    id: string,
    data: UpdateImageGenerationModelRequestDto,
  ) {
    mutation.mutate({ id, data });
  }

  return {
    updateImageGenerationModel,
    isUpdating: mutation.isPending,
  };
}
