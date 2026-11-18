import {
  sourceUploadsControllerAbort,
  sourceUploadsControllerSign,
  threadSourcesControllerCompleteUpload,
  threadSourcesControllerCreateUpload,
  threadSourcesControllerGetThreadSources,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { AttachmentSourceApi } from '@/features/outlook-tools';

/** The thread source endpoints an Outlook attachment is uploaded through. */
export const outlookAttachmentSourceApi: AttachmentSourceApi = {
  createUpload: (threadId, file) =>
    threadSourcesControllerCreateUpload(threadId, {
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    }),
  completeUpload: (threadId, uploadId) =>
    threadSourcesControllerCompleteUpload(threadId, uploadId),
  signUpload: (uploadId, body, signal) =>
    sourceUploadsControllerSign(uploadId, body, signal),
  abortUpload: (uploadId) => sourceUploadsControllerAbort(uploadId),
  listSources: (threadId) => threadSourcesControllerGetThreadSources(threadId),
};
