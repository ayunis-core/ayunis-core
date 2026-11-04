import Uppy from '@uppy/core';
import AwsS3 from '@uppy/aws-s3';
import { sourceUploadsControllerSign } from '@/shared/api/generated/ayunisCoreAPI';
import type {
  SignSourceUploadRequestDto,
  SourceUploadSessionResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export interface TransferSourceFileOptions {
  session: SourceUploadSessionResponseDto;
  file: File;
  /** Fraction of bytes stored so far, 0..1. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/** The S3 request Uppy wants signed, as its `signRequest` hook receives it. */
export interface UploadRequestToSign {
  method: SignSourceUploadRequestDto['method'];
  uploadId?: string;
  partNumber?: number;
}

export function toSignRequestBody(
  request: UploadRequestToSign,
): SignSourceUploadRequestDto {
  return {
    method: request.method,
    uploadId: request.uploadId,
    partNumber: request.partNumber,
  };
}

/**
 * Transfers `file` straight to object storage under the upload session the
 * API reserved for it. Every storage request is signed by the API on demand,
 * so an expired URL is simply re-signed on retry; Uppy handles multipart
 * parts, retries and cancellation.
 */
export async function transferSourceFile({
  session,
  file,
  onProgress,
  signal,
}: TransferSourceFileOptions): Promise<void> {
  const uppy = new Uppy({
    autoProceed: false,
    allowMultipleUploadBatches: false,
    restrictions: { maxNumberOfFiles: 1 },
  });
  uppy.use(AwsS3, {
    shouldUseMultipart: session.multipart,
    getChunkSize: () => session.partSizeBytes,
    // The key is server-chosen; the session id only identifies the upload.
    generateObjectKey: () => session.id,
    signRequest: async (request) => {
      const { url } = await sourceUploadsControllerSign(
        session.id,
        toSignRequestBody(request),
        signal,
      );
      return { url };
    },
  });

  let failure: unknown;
  uppy.on('upload-error', (_file, error) => {
    failure = error;
  });
  uppy.on('upload-progress', (_file, progress) => {
    if (progress.bytesTotal) {
      onProgress?.(progress.bytesUploaded / progress.bytesTotal);
    }
  });
  const cancel = () => uppy.cancelAll();
  signal?.addEventListener('abort', cancel);

  try {
    uppy.addFile({ name: file.name, type: file.type, data: file });
    const result = await uppy.upload();
    if (signal?.aborted) {
      throw new DOMException('Upload aborted', 'AbortError');
    }
    if ((result?.successful?.length ?? 0) !== 1) {
      throw failure instanceof Error
        ? failure
        : new Error('File transfer failed');
    }
    onProgress?.(1);
  } finally {
    signal?.removeEventListener('abort', cancel);
    uppy.destroy();
  }
}
