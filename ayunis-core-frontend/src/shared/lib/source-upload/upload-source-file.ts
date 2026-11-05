import { sourceUploadsControllerAbort } from '@/shared/api/generated/ayunisCoreAPI';
import type { SourceUploadSessionResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { transferSourceFile } from './transfer-source-file';

export interface DirectSourceUploadTarget<TResult> {
  createSession: (
    file: File,
    signal: AbortSignal,
  ) => Promise<SourceUploadSessionResponseDto>;
  complete: (uploadId: string, signal: AbortSignal) => Promise<TResult>;
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
    await transferSourceFile({ session, file, signal, onProgress });
    return await target.complete(session.id, signal);
  } catch (error) {
    if (session) {
      try {
        // The upload signal may already be aborted; cleanup needs its own request.
        await sourceUploadsControllerAbort(session.id);
      } catch {
        // Preserve the upload error; abandoned sessions are also swept server-side.
      }
    }
    throw error;
  }
}
