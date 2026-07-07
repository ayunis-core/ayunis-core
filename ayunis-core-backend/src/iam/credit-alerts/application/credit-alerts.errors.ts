import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum CreditAlertErrorCode {
  EMAIL_SENDING_FAILED = 'BUDGET_WARNING_EMAIL_SENDING_FAILED',
  UNEXPECTED_ERROR = 'UNEXPECTED_CREDIT_ALERT_ERROR',
}

export abstract class CreditAlertError extends ApplicationError {
  constructor(
    message: string,
    code: CreditAlertErrorCode,
    statusCode: number = 500,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class BudgetWarningEmailSendingFailedError extends CreditAlertError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, CreditAlertErrorCode.EMAIL_SENDING_FAILED, 500, metadata);
  }
}

export class UnexpectedCreditAlertError extends CreditAlertError {
  constructor(error?: unknown) {
    super(
      'Unexpected credit alert error occurred',
      CreditAlertErrorCode.UNEXPECTED_ERROR,
      500,
      error instanceof Error ? { error: error.message } : undefined,
    );
  }
}
