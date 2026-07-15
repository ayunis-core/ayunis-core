import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';
import { ALLOWED_RETENTION_DAYS } from '../domain/retention-period';

export enum RetentionPolicyErrorCode {
  INVALID_RETENTION_PERIOD = 'INVALID_RETENTION_PERIOD',
  UNEXPECTED_ERROR = 'UNEXPECTED_RETENTION_POLICY_ERROR',
}

export class InvalidRetentionPeriodError extends ApplicationError {
  constructor(value: number | null, metadata?: ErrorMetadata) {
    super(
      `Invalid retention period: ${value}. Allowed values are null (disabled) ` +
        `or one of [${ALLOWED_RETENTION_DAYS.join(', ')}] days.`,
      RetentionPolicyErrorCode.INVALID_RETENTION_PERIOD,
      400,
      { value, allowed: [...ALLOWED_RETENTION_DAYS], ...metadata },
    );
  }
}

export class UnexpectedRetentionPolicyError extends ApplicationError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(error.message, RetentionPolicyErrorCode.UNEXPECTED_ERROR, 500, {
      ...metadata,
      error,
    });
  }
}
