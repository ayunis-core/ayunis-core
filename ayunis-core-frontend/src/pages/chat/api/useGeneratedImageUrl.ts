import { useGeneratedImagesControllerResolve } from '@/shared/api';

const PRESIGNED_URL_STALE_TIME = 45 * 60 * 1000; // 45 min (URLs expire after 1 hr)

export function useGeneratedImageUrl(threadId: string, imageId?: string) {
  const query = useGeneratedImagesControllerResolve(threadId, imageId ?? '', {
    query: {
      enabled: !!(imageId && threadId),
      staleTime: PRESIGNED_URL_STALE_TIME,
    },
  });

  return {
    url: query.data?.url,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
