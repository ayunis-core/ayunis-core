import { artifactsControllerRevert } from '@/shared/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateArtifactQueries } from './invalidateArtifactQueries';

interface UseRevertArtifactOptions {
  artifactId: string;
  onSuccess?: () => void;
}

export function useRevertArtifact({
  artifactId,
  onSuccess,
}: UseRevertArtifactOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (versionNumber: number) =>
      artifactsControllerRevert(artifactId, { versionNumber }),
    onSuccess,
    onSettled: () => invalidateArtifactQueries(queryClient, artifactId),
  });

  return {
    revertArtifact: (versionNumber: number) => mutation.mutate(versionNumber),
    isReverting: mutation.isPending,
  };
}
