import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useSuperAdminModelsControllerUpdateEmbeddingModel,
  getSuperAdminModelsControllerGetAllCatalogModelsQueryKey,
  type UpdateEmbeddingModelRequestDto,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
export function useUpdateEmbeddingModel(onSuccess?: () => void) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminModelsControllerUpdateEmbeddingModel({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminModelsControllerGetAllCatalogModelsQueryKey(),
        });
        toast.success(t('models.updateSuccess'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error('Update embedding model failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'MODEL_NOT_FOUND':
              toast.error(t('models.notFound'));
              break;
            default:
              toast.error(t('models.updateError'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          toast.error(t('models.updateError'));
        }
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function updateEmbeddingModel(
    id: string,
    data: UpdateEmbeddingModelRequestDto,
  ) {
    mutation.mutate({ id, data });
  }

  return {
    updateEmbeddingModel,
    isUpdating: mutation.isPending,
  };
}
