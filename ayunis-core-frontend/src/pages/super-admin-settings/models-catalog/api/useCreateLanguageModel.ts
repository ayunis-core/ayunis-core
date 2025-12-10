import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
        toast.success(t('models.createSuccess'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error('Create language model failed:', error);
        const { code } = extractErrorData(error);
        switch (code) {
          case 'MODEL_ALREADY_EXISTS':
            toast.error(t('models.alreadyExists'));
            break;
          default:
            toast.error(t('models.createError'));
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
