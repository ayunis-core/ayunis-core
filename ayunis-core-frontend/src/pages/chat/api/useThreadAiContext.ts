import {
  getThreadAiContextControllerGetAiContextQueryKey,
  useThreadAiContextControllerGetAiContext,
} from '@ayunis/api-client';
import type { ThreadAiContextResponseDto } from '@ayunis/api-client';

export function useThreadAiContext(threadId: string) {
  const query = useThreadAiContextControllerGetAiContext<
    ThreadAiContextResponseDto,
    unknown
  >(threadId, {
    query: {
      enabled: !!threadId,
      queryKey: getThreadAiContextControllerGetAiContextQueryKey(threadId),
      staleTime: 0,
    },
  });

  return {
    context: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
