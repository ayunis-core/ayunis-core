import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum ShareErrorCode {
  SHARE_NOT_FOUND = 'SHARE_NOT_FOUND',
  SHARE_ALREADY_EXISTS = 'SHARE_ALREADY_EXISTS',
  UNEXPECTED_SHARE_ERROR = 'UNEXPECTED_SHARE_ERROR',
}

export abstract class ShareError extends ApplicationError {
  constructor(
    message: string,
    code: ShareErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class ShareNotFoundError extends ShareError {
  constructor(shareId: string, metadata?: ErrorMetadata) {
    super(
      `Share with ID ${shareId} not found`,
      ShareErrorCode.SHARE_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class ShareAlreadyExistsError extends ShareError {
  constructor(entityId: string, scopeType: string, metadata?: ErrorMetadata) {
    super(
      `A share already exists for this entity with ${scopeType} scope`,
      ShareErrorCode.SHARE_ALREADY_EXISTS,
      409,
      { entityId, scopeType, ...metadata },
    );
  }
}

export class UnexpectedShareError extends ShareError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(error.message, ShareErrorCode.UNEXPECTED_SHARE_ERROR, 500, {
      ...metadata,
      error,
    });
  }
}
