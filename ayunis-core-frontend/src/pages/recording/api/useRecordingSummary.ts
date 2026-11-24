import { useRecordingSummaryControllerSummary } from '@ayunis/api-client/endpoints';

export function useRecordingSummary(
  recordingId: string,
  isGenerated: boolean,
): { content: string | undefined; isLoading: boolean } {
  const { data, isLoading } = useRecordingSummaryControllerSummary(
    recordingId,
    { query: { enabled: isGenerated } },
  );
  return { content: data?.content, isLoading: isGenerated && isLoading };
}
