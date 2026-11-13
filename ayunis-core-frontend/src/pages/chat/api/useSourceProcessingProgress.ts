import { useQuery } from '@tanstack/react-query';
import {
  threadSourcesControllerGetProcessingProgress,
  getThreadSourcesControllerGetProcessingProgressQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

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
