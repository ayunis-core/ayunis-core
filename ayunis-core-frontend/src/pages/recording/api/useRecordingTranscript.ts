import { useRecordingsControllerTranscript } from '@ayunis/api-client/endpoints';
import type { RecordingTranscriptTurnDto } from '@ayunis/api-client/schemas';

export function useRecordingTranscript(
  recordingId: string,
  isTranscribed: boolean,
): { turns: RecordingTranscriptTurnDto[]; isLoading: boolean } {
  const { data, isLoading } = useRecordingsControllerTranscript(recordingId, {
    query: { enabled: isTranscribed },
  });
  return { turns: data?.turns ?? [], isLoading: isTranscribed && isLoading };
}
