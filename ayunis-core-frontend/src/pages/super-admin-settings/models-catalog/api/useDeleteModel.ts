import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getSuperAdminModelsControllerGetAllCatalogModelsQueryKey,
  useSuperAdminModelsControllerDeleteCatalogModel,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';

export function useDeleteModel() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminModelsControllerDeleteCatalogModel({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminModelsControllerGetAllCatalogModelsQueryKey(),
        });
        toast.success('Model deleted successfully');
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred';
        toast.error(`Failed to delete model: ${errorMessage}`);
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
