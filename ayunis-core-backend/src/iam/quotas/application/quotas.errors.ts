import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';
import { HttpException, HttpStatus } from '@nestjs/common';
import { QuotaType } from '../domain/quota-type.enum';

export enum QuotaErrorCode {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
}

// Translates a quota type into the noun shown to end users in the rate-limit
// message. New quota types must extend this map so the error stays
// human-readable without leaking the internal enum identifier.
function unitLabelFor(quotaType: string): string {
  return quotaType === (QuotaType.FAIR_USE_IMAGES as string)
    ? 'images'
    : 'messages';
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
    // Avoid hardcoding the window length in the message — `windowMs` is
    // super-admin-configurable per tier and the value can change at any time.
    // Phrase the message in terms of the retry hint instead so it stays
    // accurate regardless of how the window is configured. The internal
    // `quotaType` enum identifier is intentionally omitted from the message
    // to avoid leaking implementation details into logs and HTTP response
    // bodies — consumers get the tier via `code` / `metadata` instead.
    super(
      `Fair use limit reached (${limit} ${unitLabelFor(quotaType)}). Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
      QuotaErrorCode.QUOTA_EXCEEDED,
      HttpStatus.TOO_MANY_REQUESTS,
      { quotaType, limit, windowMs, retryAfterSeconds, ...metadata },
    );
  }
}
