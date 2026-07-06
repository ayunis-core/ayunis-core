import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';

export enum AuthorizationErrorCode {
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
}

export abstract class AuthorizationError extends ApplicationError {
  constructor(
    message: string,
    code: AuthorizationErrorCode,
    statusCode: number = 403,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class EmailNotVerifiedError extends AuthorizationError {
  constructor(reason?: string, metadata?: ErrorMetadata) {
    super(
      reason || 'Email not verified',
      AuthorizationErrorCode.EMAIL_NOT_VERIFIED,
      403,
      metadata,
    );
  }
}

export class RateLimitExceededError extends AuthorizationError {
  constructor(reason?: string, metadata?: ErrorMetadata) {
    super(
      reason || 'Rate limit exceeded',
      AuthorizationErrorCode.RATE_LIMIT_EXCEEDED,
      429,
      metadata,
    );
  }
}

export class SubscriptionRequiredError extends AuthorizationError {
  constructor(requiredType?: SubscriptionType, metadata?: ErrorMetadata) {
    super(
      requiredType === SubscriptionType.USAGE_BASED
        ? 'This feature requires a usage-based subscription.'
        : 'This feature requires an active subscription.',
      AuthorizationErrorCode.SUBSCRIPTION_REQUIRED,
      403,
      metadata,
    );
  }
}
