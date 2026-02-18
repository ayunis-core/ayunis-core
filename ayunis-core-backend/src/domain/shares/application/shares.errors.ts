import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

export enum ShareErrorCode {
  SHARE_NOT_FOUND = 'SHARE_NOT_FOUND',
  SHARE_ALREADY_EXISTS = 'SHARE_ALREADY_EXISTS',
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

  toHttpException() {
    switch (this.statusCode) {
      case 404:
        return new NotFoundException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
      case 409:
        return new ConflictException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
      default:
        return new BadRequestException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
    }
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
