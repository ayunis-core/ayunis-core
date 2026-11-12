import { useTranslation } from 'react-i18next';
import { uploadSourceFile } from '@/shared/lib/source-upload';
import { recordingAudioUploadTarget } from './recording-audio-upload-target';
import { handleRecordingAudioUploadError } from '@/features/recording-audio/lib/handle-recording-audio-upload-error';

/**
 * Uploads the audio picked in a create dialog once its recording exists.
 * A failed upload is reported and the recording kept: its page offers the
 * upload again.
 */
export function useUploadNewRecordingAudio() {
  const { t } = useTranslation('recordings');
  const { t: tCommon } = useTranslation('common');

  return async (recordingId: string, file: File): Promise<void> => {
    try {
      await uploadSourceFile(
        file,
        recordingAudioUploadTarget(recordingId),
        new AbortController().signal,
      );
    } catch (error) {
      handleRecordingAudioUploadError(error, t, tCommon);
    }
  };
}
