import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum BudgetAlertErrorCode {
  EMAIL_SENDING_FAILED = 'BUDGET_WARNING_EMAIL_SENDING_FAILED',
  UNEXPECTED_ERROR = 'UNEXPECTED_BUDGET_ALERT_ERROR',
}

export abstract class BudgetAlertError extends ApplicationError {
  constructor(
    message: string,
    code: BudgetAlertErrorCode,
    statusCode: number = 500,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class BudgetWarningEmailSendingFailedError extends BudgetAlertError {
  constructor(error: Error) {
    super(
      'Failed to send budget warning email',
      BudgetAlertErrorCode.EMAIL_SENDING_FAILED,
      500,
      { error: error.message },
    );
  }
}

export class UnexpectedBudgetAlertError extends BudgetAlertError {
  constructor(error?: unknown) {
    super(
      'Unexpected budget alert error occurred',
      BudgetAlertErrorCode.UNEXPECTED_ERROR,
      500,
      error instanceof Error ? { error: error.message } : undefined,
    );
  }
}
