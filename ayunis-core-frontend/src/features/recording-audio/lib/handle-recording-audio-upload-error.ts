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
    if (extractErrorData(error).code === 'RECORDING_AUDIO_ALREADY_UPLOADED') {
      showError(tRecordings('audio.alreadyUploaded'));
      return;
    }
  } catch {
    // Not an API error; the shared handler reports it generically.
  }
  handleSourceUploadError(error, tCommon);
}
