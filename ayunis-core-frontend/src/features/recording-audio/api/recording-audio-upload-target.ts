import {
  recordingUploadsControllerCompleteUpload,
  recordingUploadsControllerCreateUpload,
} from '@ayunis/api-client/endpoints';
import type { RecordingResponseDto } from '@ayunis/api-client/schemas';
import type { DirectSourceUploadTarget } from '@ayunis/api-client/source-upload';

export function recordingAudioUploadTarget(
  recordingId: string,
): DirectSourceUploadTarget<RecordingResponseDto> {
  return {
    createSession: (file, signal) =>
      recordingUploadsControllerCreateUpload(
        recordingId,
        { fileName: file.name, mimeType: file.type, fileSize: file.size },
        signal,
      ),
    complete: (uploadId, signal) =>
      recordingUploadsControllerCompleteUpload(recordingId, uploadId, signal),
  };
}
