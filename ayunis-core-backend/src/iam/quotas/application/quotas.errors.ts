import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';
import { HttpException, HttpStatus } from '@nestjs/common';

export enum QuotaErrorCode {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
}

export abstract class QuotaError extends ApplicationError {
  constructor(
    message: string,
    code: QuotaErrorCode,
    statusCode: number = 429,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }

  toHttpException() {
    return new HttpException(
      {
        code: this.code,
        message: this.message,
        ...(this.metadata && { metadata: this.metadata }),
      },
      this.statusCode,
    );
  }
}

export class QuotaExceededError extends QuotaError {
  constructor(
    quotaType: string,
    limit: number,
    retryAfterSeconds: number,
    metadata?: ErrorMetadata,
  ) {
    super(
      `Fair use limit exceeded. Maximum ${limit} messages per 3 hours. Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
      QuotaErrorCode.QUOTA_EXCEEDED,
      HttpStatus.TOO_MANY_REQUESTS,
      { quotaType, limit, retryAfterSeconds, ...metadata },
    );
  }
}
