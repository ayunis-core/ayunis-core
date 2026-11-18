import {
  recordingUploadsControllerCompleteUpload,
  recordingUploadsControllerCreateUpload,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { RecordingResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { DirectSourceUploadTarget } from '@/shared/lib/source-upload';

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
