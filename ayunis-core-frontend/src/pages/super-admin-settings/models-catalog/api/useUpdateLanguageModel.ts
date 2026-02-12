import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminModelsControllerUpdateLanguageModel,
  getSuperAdminModelsControllerGetAllCatalogModelsQueryKey,
  type UpdateLanguageModelRequestDto,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
export function useUpdateLanguageModel(onSuccess?: () => void) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminModelsControllerUpdateLanguageModel({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminModelsControllerGetAllCatalogModelsQueryKey(),
        });
        showSuccess(t('models.updateSuccess'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error('Update language model failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'MODEL_NOT_FOUND':
              showError(t('models.notFound'));
              break;
            default:
              showError(t('models.updateError'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('models.updateError'));
        }
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function updateLanguageModel(
    id: string,
    data: UpdateLanguageModelRequestDto,
  ) {
    mutation.mutate({ id, data });
  }

  return {
    updateLanguageModel,
    isUpdating: mutation.isPending,
  };
}
