import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getRecordingsControllerFindOneQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import { useDirectSourceUpload } from '@/shared/lib/source-upload';
import { recordingAudioUploadTarget } from './recording-audio-upload-target';
import { handleRecordingAudioUploadError } from '@/features/recording-audio/lib/handle-recording-audio-upload-error';

/**
 * Uploads the audio of an existing recording straight to storage, with
 * progress. A failed upload is reported and leaves the recording without
 * audio, so the upload can be tried again.
 */
export function useUploadRecordingAudio(recordingId: string) {
  const { t } = useTranslation('recordings');
  const { t: tCommon } = useTranslation('common');
  const queryClient = useQueryClient();

  const { upload, uploads, isUploading } = useDirectSourceUpload(
    recordingAudioUploadTarget(recordingId),
    {
      onSuccess: (recording) => {
        queryClient.setQueryData(
          getRecordingsControllerFindOneQueryKey(recordingId),
          recording,
        );
      },
      onError: (error) => handleRecordingAudioUploadError(error, t, tCommon),
    },
    { scope: recordingId },
  );

  return { uploadAudio: upload, uploads, isUploading };
}
