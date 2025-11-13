import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useSuperAdminModelsControllerCreateEmbeddingModel,
  getSuperAdminModelsControllerGetAllCatalogModelsQueryKey,
  type CreateEmbeddingModelRequestDto,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';

export function useCreateEmbeddingModel(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminModelsControllerCreateEmbeddingModel({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminModelsControllerGetAllCatalogModelsQueryKey(),
        });
        toast.success('Embedding model created successfully');
        onSuccess?.();
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred';
        toast.error(`Failed to create embedding model: ${errorMessage}`);
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
