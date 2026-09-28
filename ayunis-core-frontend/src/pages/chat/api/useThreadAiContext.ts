import {
  getThreadAiContextControllerGetAiContextQueryKey,
  useThreadAiContextControllerGetAiContext,
} from '@/shared/api';
import type { ThreadAiContextResponseDto } from '@/shared/api';

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
