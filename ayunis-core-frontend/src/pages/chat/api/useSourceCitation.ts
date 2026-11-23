import type { SourceCitationResponseDto } from '@ayunis/api-client';
import { useThreadSourceCitationsControllerGetSourceCitation } from '@ayunis/api-client/endpoints';

interface SourceCitationState {
  citation: SourceCitationResponseDto | null;
  isLoading: boolean;
  error: unknown;
}

export function useSourceCitation(
  threadId: string,
  chunkId: string,
): SourceCitationState {
  const { data, isLoading, error } =
    useThreadSourceCitationsControllerGetSourceCitation(threadId, chunkId);

  return {
    citation: data ?? null,
    isLoading,
    error,
  };
}
