import { sourceUploadsControllerAbort } from '@ayunis/api-client/endpoints';
import type { SourceUploadSessionResponseDto } from '@ayunis/api-client/schemas';
import {
  transferSourceFile,
  type SignUploadRequest,
} from './transfer-source-file';

export interface DirectSourceUploadTarget<TResult> {
  createSession: (
    file: File,
    signal: AbortSignal,
  ) => Promise<SourceUploadSessionResponseDto>;
  complete: (uploadId: string, signal: AbortSignal) => Promise<TResult>;
  /** Both default to the app's cookie-authenticated API client. */
  sign?: SignUploadRequest;
  abort?: (uploadId: string) => Promise<void>;
}

export async function uploadSourceFile<TResult>(
  file: File,
  target: DirectSourceUploadTarget<TResult>,
  signal: AbortSignal,
  onProgress?: (fraction: number) => void,
): Promise<TResult> {
  let session: SourceUploadSessionResponseDto | undefined;
  try {
    session = await target.createSession(file, signal);
    await transferSourceFile({
      session,
      file,
      signal,
      onProgress,
      sign: target.sign,
    });
    return await target.complete(session.id, signal);
  } catch (error) {
    if (session) {
      try {
        // The upload signal may already be aborted; cleanup needs its own request.
        await (target.abort ?? sourceUploadsControllerAbort)(session.id);
      } catch {
        // Preserve the upload error; abandoned sessions are also swept server-side.
      }
    }
    throw error;
  }
}
