import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
        toast.success(t('models.deleteSuccess'));
      },
      onError: (error: unknown) => {
        console.error('Delete model failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'MODEL_NOT_FOUND':
              toast.error(t('models.notFound'));
              break;
            default:
              toast.error(t('models.deleteError'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          toast.error(t('models.deleteError'));
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
