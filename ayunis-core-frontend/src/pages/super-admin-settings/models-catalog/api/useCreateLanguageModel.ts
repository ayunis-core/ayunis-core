import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useSuperAdminModelsControllerCreateLanguageModel,
  getSuperAdminModelsControllerGetAllCatalogModelsQueryKey,
  type CreateLanguageModelRequestDto,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
export function useCreateLanguageModel(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminModelsControllerCreateLanguageModel({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminModelsControllerGetAllCatalogModelsQueryKey(),
        });
        toast.success('Language model created successfully');
        onSuccess?.();
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred';
        toast.error(`Failed to create language model: ${errorMessage}`);
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
