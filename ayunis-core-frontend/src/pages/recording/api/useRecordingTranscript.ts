import { useRecordingsControllerTranscript } from '@/shared/api/generated/ayunisCoreAPI';
import type { RecordingTranscriptTurnDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function useRecordingTranscript(
  recordingId: string,
  isTranscribed: boolean,
): { turns: RecordingTranscriptTurnDto[]; isLoading: boolean } {
  const { data, isLoading } = useRecordingsControllerTranscript(recordingId, {
    query: { enabled: isTranscribed },
  });
  return { turns: data?.turns ?? [], isLoading: isTranscribed && isLoading };
}
