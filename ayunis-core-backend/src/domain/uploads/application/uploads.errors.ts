import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum UploadErrorCode {
  UPLOAD_NOT_FOUND = 'UPLOAD_NOT_FOUND',
  UPLOAD_INCOMPLETE = 'UPLOAD_INCOMPLETE',
  UNEXPECTED_UPLOAD_ERROR = 'UNEXPECTED_UPLOAD_ERROR',
}

export abstract class UploadError extends ApplicationError {
  constructor(
    message: string,
    code: UploadErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class UploadNotFoundError extends UploadError {
  constructor(uploadId: string, metadata?: ErrorMetadata) {
    super(
      `Upload '${uploadId}' not found`,
      UploadErrorCode.UPLOAD_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class UploadIncompleteError extends UploadError {
  constructor(uploadId: string, metadata?: ErrorMetadata) {
    super(
      `Upload '${uploadId}' has not finished transferring yet`,
      UploadErrorCode.UPLOAD_INCOMPLETE,
      409,
      metadata,
    );
  }
}

export class UnexpectedUploadError extends UploadError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(error.message, UploadErrorCode.UNEXPECTED_UPLOAD_ERROR, 500, {
      ...metadata,
      error,
    });
  }
}
