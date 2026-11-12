import type { TFunction } from 'i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { showError } from '@/shared/lib/toast';

/**
 * `tRecordings` reads the `recordings` namespace, `tCommon` the `common` one
 * with the shared upload messages (type, size, interrupted upload, …).
 */
export function handleRecordingAudioUploadError(
  error: unknown,
  tRecordings: TFunction,
  tCommon: TFunction,
): void {
  try {
    const { code, metadata } = extractErrorData(error);
    if (code === 'RECORDING_AUDIO_ALREADY_UPLOADED') {
      showError(tRecordings('audio.alreadyUploaded'));
      return;
    }
    if (code === 'QUOTA_EXCEEDED') {
      const retryAfterSeconds = Number(metadata?.retryAfterSeconds);
      showError(
        retryAfterSeconds > 0
          ? tRecordings('audio.uploadLimitReachedWithTime', {
              minutes: Math.ceil(retryAfterSeconds / 60),
            })
          : tRecordings('audio.uploadLimitReached'),
      );
      return;
    }
  } catch {
    // Not an API error; the shared handler reports it generically.
  }
  handleSourceUploadError(error, tCommon);
}
