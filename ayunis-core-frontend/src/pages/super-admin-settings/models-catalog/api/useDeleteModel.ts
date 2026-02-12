import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  getSuperAdminModelsControllerGetAllCatalogModelsQueryKey,
  useSuperAdminModelsControllerDeleteCatalogModel,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

export function useDeleteModel() {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminModelsControllerDeleteCatalogModel({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminModelsControllerGetAllCatalogModelsQueryKey(),
        });
        showSuccess(t('models.deleteSuccess'));
      },
      onError: (error: unknown) => {
        console.error('Delete model failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'MODEL_NOT_FOUND':
              showError(t('models.notFound'));
              break;
            default:
              showError(t('models.deleteError'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('models.deleteError'));
        }
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function deleteModel(id: string) {
    mutation.mutate({ id });
  }

  return {
    deleteModel,
    isDeleting: mutation.isPending,
  };
}
