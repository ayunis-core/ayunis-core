import { useGeneratedImagesControllerResolve } from '@/shared/api';

interface UseResolveGeneratedImageParams {
  threadId: string;
  imageId: string;
}

export function useResolveGeneratedImage({
  threadId,
  imageId,
}: UseResolveGeneratedImageParams) {
  const query = useGeneratedImagesControllerResolve(threadId, imageId, {
    query: {
      enabled: !!threadId && !!imageId,
    },
  });

  return {
    url: query.data?.url,
    expiresAt: query.data?.expiresAt,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
