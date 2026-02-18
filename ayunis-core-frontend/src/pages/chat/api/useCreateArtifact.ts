import {
  artifactsControllerCreate,
  getArtifactsControllerFindByThreadQueryKey,
} from '@/shared/api';
import type { CreateArtifactDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateArtifact(threadId: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateArtifactDto) => artifactsControllerCreate(data),
    onSuccess,
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: getArtifactsControllerFindByThreadQueryKey(threadId),
      });
    },
  });

  return {
    createArtifact: (data: CreateArtifactDto) => mutation.mutate(data),
    isCreating: mutation.isPending,
    data: mutation.data,
  };
}
