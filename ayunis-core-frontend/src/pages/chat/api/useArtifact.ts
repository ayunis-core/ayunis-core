import { useArtifactsControllerFindOne } from '@/shared/api';

export function useArtifact(artifactId: string | null) {
  const query = useArtifactsControllerFindOne(artifactId ?? '', {
    query: { enabled: !!artifactId },
  });

  return {
    artifact: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
