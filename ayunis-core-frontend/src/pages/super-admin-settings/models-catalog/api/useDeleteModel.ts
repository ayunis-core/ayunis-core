import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  getSuperAdminCatalogModelsControllerGetAllCatalogModelsQueryKey,
  useSuperAdminCatalogModelsControllerDeleteCatalogModel,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import { resolveModelErrorToastKey } from '../lib/resolveModelErrorToastKey';

export function useDeleteModel() {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminCatalogModelsControllerDeleteCatalogModel({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey:
            getSuperAdminCatalogModelsControllerGetAllCatalogModelsQueryKey(),
        });
        showSuccess(t('models.deleteSuccess'));
      },
      onError: (error: unknown) => {
        console.error('Delete model failed:', error);
        try {
          const { code } = extractErrorData(error);
          showError(t(resolveModelErrorToastKey(code, 'models.deleteError')));
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
