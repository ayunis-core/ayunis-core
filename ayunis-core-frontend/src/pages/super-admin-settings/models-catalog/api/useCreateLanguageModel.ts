import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminModelsControllerCreateLanguageModel,
  getSuperAdminModelsControllerGetAllCatalogModelsQueryKey,
  type CreateLanguageModelRequestDto,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
export function useCreateLanguageModel(onSuccess?: () => void) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminModelsControllerCreateLanguageModel({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminModelsControllerGetAllCatalogModelsQueryKey(),
        });
        showSuccess(t('models.createSuccess'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error('Create language model failed:', error);
        try {
          const { code } = extractErrorData(error);
          if (code === 'MODEL_ALREADY_EXISTS') {
            showError(t('models.alreadyExists'));
          } else {
            showError(t('models.createError'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('models.createError'));
        }
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function createLanguageModel(data: CreateLanguageModelRequestDto) {
    mutation.mutate({ data });
  }

  return {
    createLanguageModel,
    isCreating: mutation.isPending,
  };
}
