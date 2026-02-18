import {
  artifactsControllerUpdate,
  getArtifactsControllerFindOneQueryKey,
  getArtifactsControllerFindByThreadQueryKey,
} from '@/shared/api';
import type { UpdateArtifactDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UseUpdateArtifactOptions {
  artifactId: string;
  threadId: string;
  onSuccess?: () => void;
}

export function useUpdateArtifact({
  artifactId,
  threadId,
  onSuccess,
}: UseUpdateArtifactOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: UpdateArtifactDto) =>
      artifactsControllerUpdate(artifactId, data),
    onSuccess,
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: getArtifactsControllerFindOneQueryKey(artifactId),
      });
      void queryClient.invalidateQueries({
        queryKey: getArtifactsControllerFindByThreadQueryKey(threadId),
      });
    },
  });

  return {
    updateArtifact: (data: UpdateArtifactDto) => mutation.mutate(data),
    isUpdating: mutation.isPending,
  };
}
