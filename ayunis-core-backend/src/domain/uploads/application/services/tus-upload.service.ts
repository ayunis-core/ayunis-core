import { Injectable, Logger } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'http';
import { join } from 'path';
import * as fs from 'fs';
import type { UUID } from 'crypto';
import { Server, type Upload } from '@tus/server';
import { FileStore } from '@tus/file-store';
import {
  MAX_SOURCE_FILE_SIZE_BYTES,
  removeUploadedFile,
  type UploadedFileRef,
} from 'src/common/util/source-file-upload';
import { UploadIncompleteError, UploadNotFoundError } from '../uploads.errors';

const UPLOADS_DIR = './uploads';
// Partial uploads that never complete are swept after a day.
const UPLOAD_EXPIRATION_MS = 24 * 60 * 60 * 1000;
const USER_ID_HEADER = 'x-ayunis-upload-user-id';
// FileStore ids are crypto-random hex; anything else is a traversal attempt.
const UPLOAD_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Wraps the tus protocol server (resumable, chunked uploads) around the same
 * ./uploads directory multer uses: a completed tus upload is handed to the
 * existing file-source flows as a plain UploadedFileRef.
 */
@Injectable()
export class TusUploadService {
  private readonly logger = new Logger(TusUploadService.name);
  private readonly store = new FileStore({
    directory: UPLOADS_DIR,
    expirationPeriodInMilliseconds: UPLOAD_EXPIRATION_MS,
  });
  private readonly server = new Server({
    path: '/api/uploads/tus',
    datastore: this.store,
    maxSize: MAX_SOURCE_FILE_SIZE_BYTES,
    respectForwardedHeaders: true,
    // Cookie auth means credentialed requests, where the wildcard origin the
    // tus server emits by default is rejected by browsers. Reflecting the
    // request origin is safe here: the global CORS layer has already vetted
    // it before the request reaches this handler.
    allowedCredentials: true,
    allowedOrigins: () => true,
    // Stamp the authenticated user onto the upload so only its creator can
    // finalize it. The header is set server-side in handle(); a client-sent
    // value never survives because handle() always overwrites it.
    onUploadCreate: (req, upload) => {
      const userId = req.headers.get(USER_ID_HEADER) ?? undefined;
      return Promise.resolve({
        metadata: { ...upload.metadata, userId: userId ?? null },
      });
    },
  });

  /** Delegates a tus protocol request (POST/HEAD/PATCH/OPTIONS/DELETE). */
  async handle(
    req: IncomingMessage,
    res: ServerResponse,
    userId: UUID,
  ): Promise<void> {
    req.headers[USER_ID_HEADER] = userId;
    await this.server.handle(req, res);
  }

  /**
   * Resolves a finished upload to the multer-equivalent file ref. Throws 404
   * for unknown ids and ids created by another user, 409 while transferring.
   */
  async resolveCompletedUpload(
    uploadId: string,
    userId: UUID,
  ): Promise<UploadedFileRef> {
    const upload = await this.getOwnedUploadOrThrow(uploadId, userId);

    if (upload.size === undefined || upload.offset !== upload.size) {
      throw new UploadIncompleteError(uploadId);
    }

    return {
      path: join(UPLOADS_DIR, uploadId),
      originalname: upload.metadata?.filename ?? uploadId,
      mimetype: upload.metadata?.filetype ?? 'application/octet-stream',
    };
  }

  /** Foreign and malformed ids report 404 like unknown ones — no enumeration. */
  private async getOwnedUploadOrThrow(
    uploadId: string,
    userId: UUID,
  ): Promise<Upload> {
    if (!UPLOAD_ID_PATTERN.test(uploadId)) {
      throw new UploadNotFoundError(uploadId);
    }

    let upload: Upload;
    try {
      upload = await this.store.getUpload(uploadId);
    } catch {
      throw new UploadNotFoundError(uploadId);
    }

    if (upload.metadata?.userId && upload.metadata.userId !== userId) {
      throw new UploadNotFoundError(uploadId);
    }
    return upload;
  }

  /** Removes the upload's data and info files; best-effort. */
  cleanupUpload(uploadId: string): void {
    if (!UPLOAD_ID_PATTERN.test(uploadId)) {
      return;
    }
    removeUploadedFile(join(UPLOADS_DIR, uploadId));
    try {
      fs.unlinkSync(join(UPLOADS_DIR, `${uploadId}.json`));
    } catch {
      // e.g. ENOENT when the info file was already removed
    }
  }

  /** Removes expired partial uploads; returns how many were deleted. */
  async cleanUpExpired(): Promise<number> {
    return this.server.cleanUpExpiredUploads();
  }
}
