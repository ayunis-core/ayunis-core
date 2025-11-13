import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useSuperAdminModelsControllerUpdateLanguageModel,
  getSuperAdminModelsControllerGetAllCatalogModelsQueryKey,
  type UpdateLanguageModelRequestDto,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
export function useUpdateLanguageModel(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminModelsControllerUpdateLanguageModel({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminModelsControllerGetAllCatalogModelsQueryKey(),
        });
        toast.success('Language model updated successfully');
        onSuccess?.();
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred';
        toast.error(`Failed to update language model: ${errorMessage}`);
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
