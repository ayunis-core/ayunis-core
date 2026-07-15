import { ApplicationError } from 'src/common/errors/base.error';
import type { ErrorMetadata } from 'src/common/errors/base.error';

export enum EmailErrorCode {
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
  UNEXPECTED_EMAIL_ERROR = 'UNEXPECTED_EMAIL_ERROR',
}

export abstract class EmailError extends ApplicationError {
  constructor(
    message: string,
    code: EmailErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class EmailSendFailedError extends EmailError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(reason, EmailErrorCode.EMAIL_SEND_FAILED, 500, metadata);
  }
}

export class UnexpectedEmailError extends EmailError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(error.message, EmailErrorCode.UNEXPECTED_EMAIL_ERROR, 500, {
      ...metadata,
      error,
    });
  }
}
