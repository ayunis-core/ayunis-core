import { useMcpOAuthMetadataControllerGetClientMetadata } from '@/shared/api';
import { getOAuthCallbackUri } from '@/shared/lib/mcp-oauth';

export function useMcpOAuthClientMetadata() {
  const query = useMcpOAuthMetadataControllerGetClientMetadata({
    query: { staleTime: Number.POSITIVE_INFINITY },
  });
  return {
    callbackUri: query.data?.redirect_uris[0] ?? getOAuthCallbackUri(),
    isLoading: query.isLoading,
  };
}
