import * as tus from 'tus-js-client';
import config from '@/shared/config';

const CHUNK_SIZE_BYTES = 10 * 1024 * 1024;
// tus retries transient failures itself; these delays also cover short
// connection drops (resume continues from the last completed chunk).
const RETRY_DELAYS_MS = [0, 1000, 3000, 5000, 10_000];

export interface ResumableUploadOptions {
  /** 0–100, fired as chunks complete. */
  onProgress?: (percent: number) => void;
}

/**
 * Uploads a file in resumable chunks via the tus endpoint and resolves with
 * the upload id, which the caller passes to the matching finalize endpoint
 * (thread/skill/knowledge-base) to run validation and start processing.
 */
export function uploadFileResumable(
  file: File,
  options: ResumableUploadOptions = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${config.api.baseUrl}/uploads/tus`,
      chunkSize: CHUNK_SIZE_BYTES,
      retryDelays: RETRY_DELAYS_MS,
      metadata: {
        filename: file.name,
        filetype: file.type,
      },
      removeFingerprintOnSuccess: true,
      onBeforeRequest: (req) => {
        // Session cookie auth, same as the axios client.
        const xhr = req.getUnderlyingObject() as XMLHttpRequest;
        xhr.withCredentials = true;
      },
      onProgress: (bytesSent, bytesTotal) => {
        options.onProgress?.(
          bytesTotal > 0 ? Math.round((bytesSent / bytesTotal) * 100) : 0,
        );
      },
      onError: reject,
      onSuccess: () => {
        const uploadId = upload.url?.split('/').pop();
        if (!uploadId) {
          reject(new Error('Upload finished without an upload id'));
          return;
        }
        resolve(uploadId);
      },
    });

    // Resume an interrupted upload of the same file when possible.
    void upload
      .findPreviousUploads()
      .then((previous) => {
        if (previous.length > 0) {
          upload.resumeFromPreviousUpload(previous[0]);
        }
        upload.start();
      })
      .catch(() => upload.start());
  });
}
