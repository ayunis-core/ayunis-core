import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useSuperAdminModelsControllerCreateEmbeddingModel,
  getSuperAdminModelsControllerGetAllCatalogModelsQueryKey,
  type CreateEmbeddingModelRequestDto,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

export function useCreateEmbeddingModel(onSuccess?: () => void) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminModelsControllerCreateEmbeddingModel({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminModelsControllerGetAllCatalogModelsQueryKey(),
        });
        toast.success(t('models.createSuccess'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error('Create embedding model failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'MODEL_ALREADY_EXISTS':
              toast.error(t('models.alreadyExists'));
              break;
            default:
              toast.error(t('models.createError'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          toast.error(t('models.createError'));
        }
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function createEmbeddingModel(data: CreateEmbeddingModelRequestDto) {
    mutation.mutate({ data });
  }

  return {
    createEmbeddingModel,
    isCreating: mutation.isPending,
  };
}
