import type { SourceCitationResponseDto } from '@/shared/api';
import { useThreadSourceCitationsControllerGetSourceCitation } from '@/shared/api/generated/ayunisCoreAPI';

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
