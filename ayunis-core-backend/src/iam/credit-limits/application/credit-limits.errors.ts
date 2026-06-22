import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum CreditLimitErrorCode {
  CREDIT_LIMIT_NOT_FOUND = 'CREDIT_LIMIT_NOT_FOUND',
  INVALID_CREDIT_LIMIT = 'INVALID_CREDIT_LIMIT',
  TARGET_NOT_FOUND = 'CREDIT_LIMIT_TARGET_NOT_FOUND',
  USER_CREDIT_LIMIT_EXCEEDED = 'USER_CREDIT_LIMIT_EXCEEDED',
  TEAM_CREDIT_LIMIT_EXCEEDED = 'TEAM_CREDIT_LIMIT_EXCEEDED',
  UNEXPECTED_ERROR = 'UNEXPECTED_CREDIT_LIMIT_ERROR',
}

export abstract class CreditLimitError extends ApplicationError {
  constructor(
    message: string,
    code: CreditLimitErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class InvalidCreditLimitError extends CreditLimitError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, CreditLimitErrorCode.INVALID_CREDIT_LIMIT, 400, metadata);
  }
}

export class CreditLimitTargetNotFoundError extends CreditLimitError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Credit limit target not found',
      CreditLimitErrorCode.TARGET_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class CreditLimitNotFoundError extends CreditLimitError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Credit limit not found',
      CreditLimitErrorCode.CREDIT_LIMIT_NOT_FOUND,
      404,
      metadata,
    );
  }
}

// Message kept generic; the limit and consumption travel in `metadata`.
export class UserCreditLimitExceededError extends CreditLimitError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Your monthly credit limit has been reached',
      CreditLimitErrorCode.USER_CREDIT_LIMIT_EXCEEDED,
      429,
      metadata,
    );
  }
}

export class TeamCreditLimitExceededError extends CreditLimitError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Your team monthly credit limit has been reached',
      CreditLimitErrorCode.TEAM_CREDIT_LIMIT_EXCEEDED,
      429,
      metadata,
    );
  }
}

export class UnexpectedCreditLimitError extends CreditLimitError {
  constructor(error?: unknown) {
    super(
      'Unexpected credit limit error occurred',
      CreditLimitErrorCode.UNEXPECTED_ERROR,
      500,
      error instanceof Error ? { error: error.message } : undefined,
    );
  }
}
