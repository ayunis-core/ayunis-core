import {
  artifactsControllerUpdate,
  getArtifactsControllerFindOneQueryKey,
  getArtifactsControllerFindByThreadQueryKey,
  getArtifactsControllerFindByWorkspaceQueryKey,
} from '@/shared/api';
import type { UpdateArtifactDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UseUpdateArtifactOptions {
  artifactId: string;
  threadId: string;
  workspaceId?: string | null;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function useUpdateArtifact({
  artifactId,
  threadId,
  workspaceId,
  onSuccess,
  onError,
}: UseUpdateArtifactOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: UpdateArtifactDto) =>
      artifactsControllerUpdate(artifactId, data),
    onSuccess,
    onError,
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: getArtifactsControllerFindOneQueryKey(artifactId),
      });
      void queryClient.invalidateQueries({
        queryKey: getArtifactsControllerFindByThreadQueryKey(threadId),
      });
      if (workspaceId) {
        void queryClient.invalidateQueries({
          queryKey: getArtifactsControllerFindByWorkspaceQueryKey(workspaceId),
        });
      }
    },
  });

  return {
    updateArtifact: (data: UpdateArtifactDto) => mutation.mutate(data),
    updateArtifactAsync: (data: UpdateArtifactDto) =>
      mutation.mutateAsync(data),
    isUpdating: mutation.isPending,
  };
}
