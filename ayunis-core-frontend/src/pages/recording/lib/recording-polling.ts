import type { RecordingStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';

const PROCESSING_POLL_MS = 5000;

/** The recording is re-read while its transcript or summary is on its way. */
export function recordingRefetchInterval(
  status: RecordingStatus | undefined,
): number | false {
  return status === 'transcribing' || status === 'summarizing'
    ? PROCESSING_POLL_MS
    : false;
}
