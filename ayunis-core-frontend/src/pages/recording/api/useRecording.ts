import { useRecordingsControllerFindOne } from '@ayunis/api-client/endpoints';
import type { RecordingResponseDto } from '@ayunis/api-client/schemas';
import { recordingRefetchInterval } from '@/pages/recording/lib/recording-polling';

/** The recording as loaded by the route, kept current while it is transcribed. */
export function useRecording(
  loaded: RecordingResponseDto,
): RecordingResponseDto {
  const { data } = useRecordingsControllerFindOne(loaded.id, {
    query: {
      initialData: loaded,
      refetchInterval: (query) =>
        recordingRefetchInterval(query.state.data?.status),
    },
  });
  return data;
}
