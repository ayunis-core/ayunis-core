import { useQuery } from '@tanstack/react-query';
import {
  threadSourcesControllerGetProcessingProgress,
  getThreadSourcesControllerGetProcessingProgressQueryKey,
} from '@ayunis/api-client/endpoints';

export function useSourceProcessingProgress(
  threadId: string,
  processing: boolean,
) {
  return useQuery({
    queryKey: getThreadSourcesControllerGetProcessingProgressQueryKey(threadId),
    queryFn: () => threadSourcesControllerGetProcessingProgress(threadId),
    enabled: processing,
    refetchInterval: processing ? 1500 : false,
  });
}
