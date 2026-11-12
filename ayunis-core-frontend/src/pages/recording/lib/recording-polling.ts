import type { RecordingStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';

const TRANSCRIBING_POLL_MS = 5000;

/** The recording is re-read while its transcript is on its way. */
export function recordingRefetchInterval(
  status: RecordingStatus | undefined,
): number | false {
  return status === 'transcribing' ? TRANSCRIBING_POLL_MS : false;
}
