import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useSuperAdminModelsControllerUpdateEmbeddingModel,
  getSuperAdminModelsControllerGetAllCatalogModelsQueryKey,
  type UpdateEmbeddingModelRequestDto,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
export function useUpdateEmbeddingModel(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminModelsControllerUpdateEmbeddingModel({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminModelsControllerGetAllCatalogModelsQueryKey(),
        });
        toast.success('Embedding model updated successfully');
        onSuccess?.();
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred';
        toast.error(`Failed to update embedding model: ${errorMessage}`);
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
