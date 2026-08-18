import {
  artifactsControllerRevert,
  getArtifactsControllerFindOneQueryKey,
  getArtifactsControllerFindByThreadQueryKey,
  getArtifactsControllerFindByWorkspaceQueryKey,
} from '@/shared/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UseRevertArtifactOptions {
  artifactId: string;
  threadId: string;
  workspaceId?: string | null;
  onSuccess?: () => void;
}

export function useRevertArtifact({
  artifactId,
  threadId,
  workspaceId,
  onSuccess,
}: UseRevertArtifactOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (versionNumber: number) =>
      artifactsControllerRevert(artifactId, { versionNumber }),
    onSuccess,
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
    revertArtifact: (versionNumber: number) => mutation.mutate(versionNumber),
    isReverting: mutation.isPending,
  };
}
