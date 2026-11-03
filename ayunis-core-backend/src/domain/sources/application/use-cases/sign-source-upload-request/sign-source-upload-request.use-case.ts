import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SourceUploadSessionRepository } from 'src/domain/sources/application/ports/source-upload-session.repository';
import { SourceUploadSessionAccessService } from 'src/domain/sources/application/services/source-upload-session-access.service';
import {
  SourceUploadRequestNotAllowedError,
  UnexpectedSourceError,
} from 'src/domain/sources/application/sources.errors';
import type { SourceUploadSession } from 'src/domain/sources/domain/upload/source-upload-session.entity';
import { SOURCE_UPLOAD_URL_TTL_SECONDS } from 'src/domain/sources/domain/upload/source-upload.constants';
import type { UploadRequest } from 'src/domain/storage/domain/multipart-upload.object';
import { PresignUploadRequestUseCase } from 'src/domain/storage/application/use-cases/presign-upload-request/presign-upload-request.use-case';
import { PresignUploadRequestCommand } from 'src/domain/storage/application/use-cases/presign-upload-request/presign-upload-request.command';
import { SignSourceUploadRequestCommand } from './sign-source-upload-request.command';

export interface SignedSourceUploadRequest {
  url: string;
  expiresAt: Date;
}

/**
 * Signs one S3 request the browser wants to send for its own pending upload:
 * a whole-object PUT, or a multipart step (initiate, part, list, complete,
 * abort). Only the requests that fit the session's transfer mode are signed,
 * and the key is always the session's server-chosen one. URLs are short-lived;
 * the client signs again on retry.
 */
@Injectable()
export class SignSourceUploadRequestUseCase {
  constructor(
    private readonly access: SourceUploadSessionAccessService,
    private readonly sessions: SourceUploadSessionRepository,
    private readonly presignUploadRequest: PresignUploadRequestUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(
    command: SignSourceUploadRequestCommand,
  ): Promise<SignedSourceUploadRequest> {
    const session = await this.access.requireTransferable(command.uploadId);
    const request = this.resolveRequest(session, command);
    if (
      command.multipartUploadId !== undefined &&
      command.multipartUploadId !== session.multipartUploadId
    ) {
      await this.sessions.recordMultipartUploadId(
        session.id,
        command.multipartUploadId,
      );
    }
    const url = await this.presignUploadRequest.execute(
      new PresignUploadRequestCommand(
        session.storageKey,
        request,
        SOURCE_UPLOAD_URL_TTL_SECONDS,
      ),
    );
    return {
      url,
      expiresAt: new Date(Date.now() + SOURCE_UPLOAD_URL_TTL_SECONDS * 1000),
    };
  }

  private resolveRequest(
    session: SourceUploadSession,
    command: SignSourceUploadRequestCommand,
  ): UploadRequest {
    const { method, multipartUploadId: uploadId, partNumber } = command;
    if (!session.multipart) {
      if (
        method === 'PUT' &&
        uploadId === undefined &&
        partNumber === undefined
      )
        return { method, query: {} };
      throw new SourceUploadRequestNotAllowedError(session.id, { method });
    }
    if (method === 'POST' && uploadId === undefined) {
      return { method, query: { uploads: '' } };
    }
    if (uploadId === undefined) {
      throw new SourceUploadRequestNotAllowedError(session.id, { method });
    }
    if (method === 'PUT') {
      if (partNumber === undefined) {
        throw new SourceUploadRequestNotAllowedError(session.id, { method });
      }
      return { method, query: { uploadId, partNumber: String(partNumber) } };
    }
    return { method, query: { uploadId } };
  }
}
