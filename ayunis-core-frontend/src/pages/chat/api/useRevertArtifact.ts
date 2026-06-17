import {
  artifactsControllerRevert,
  getArtifactsControllerFindOneQueryKey,
  getArtifactsControllerFindByThreadQueryKey,
} from '@/shared/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UseRevertArtifactOptions {
  artifactId: string;
  threadId: string;
  onSuccess?: () => void;
}

export function useRevertArtifact({
  artifactId,
  threadId,
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
    },
  });

  return {
    revertArtifact: (versionNumber: number) => mutation.mutate(versionNumber),
    isReverting: mutation.isPending,
  };
}
