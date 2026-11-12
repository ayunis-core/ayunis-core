import { useQuery } from '@tanstack/react-query';
import {
  getThreadsControllerFindOneQueryKey,
  threadsControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';
import { SourceResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useProcessingPollInterval } from '@/shared/lib/processing-poll';
import type { Thread } from '@/pages/chat/model/openapi';

function hasProcessingSource(thread: Thread | undefined): boolean {
  return (
    thread?.sources.some(
      (source) => source.status === SourceResponseDtoStatus.processing,
    ) ?? false
  );
}

export function useChatThread(initialThread: Thread, isStreaming: boolean) {
  const processingPollInterval = useProcessingPollInterval(initialThread.id);
  const { data: thread = initialThread } = useQuery({
    queryKey: getThreadsControllerFindOneQueryKey(initialThread.id),
    queryFn: () => threadsControllerFindOne(initialThread.id),
    initialData: initialThread,
    staleTime: 0,
    // Polling during streaming can replace local output with stale persisted text.
    refetchInterval: (query) =>
      processingPollInterval(
        !isStreaming && hasProcessingSource(query.state.data),
      ),
  });

  return { thread, hasProcessingSources: hasProcessingSource(thread) };
}
