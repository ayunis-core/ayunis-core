import {
  getThreadAiContextControllerGetAiContextQueryKey,
  useThreadAiContextControllerGetAiContext,
} from '@/shared/api';
import type { ThreadAiContextResponseDto } from '@/shared/api';

export function useThreadAiContext(threadId: string, enabled: boolean) {
  const query = useThreadAiContextControllerGetAiContext<
    ThreadAiContextResponseDto,
    unknown
  >(threadId, {
    query: {
      enabled: enabled && !!threadId,
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
