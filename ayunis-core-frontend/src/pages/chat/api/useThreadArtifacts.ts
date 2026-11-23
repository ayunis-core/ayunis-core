import { useArtifactsControllerFindByThread } from '@ayunis/api-client';

export function useThreadArtifacts(threadId: string) {
  const query = useArtifactsControllerFindByThread(threadId, {
    query: { enabled: !!threadId },
  });

  return {
    artifacts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
