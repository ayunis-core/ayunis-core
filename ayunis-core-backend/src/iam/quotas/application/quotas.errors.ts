import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';
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
    windowMs: number,
    retryAfterSeconds: number,
    metadata?: ErrorMetadata,
  ) {
    // The message intentionally omits the configured limit and the internal
    // `quotaType` identifier — both are super-admin-configurable
    // implementation details that should not leak into logs, HTTP response
    // bodies, or LLM tool results. Consumers that need the numbers can read
    // them from `metadata`.
    super(
      `Fair use limit reached. Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
      QuotaErrorCode.QUOTA_EXCEEDED,
      HttpStatus.TOO_MANY_REQUESTS,
      { quotaType, limit, windowMs, retryAfterSeconds, ...metadata },
    );
  }
}
