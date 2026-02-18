import { ApplicationError } from 'src/common/errors/base.error';
import { ErrorMetadata } from 'src/common/errors/base.error';

export enum EmailErrorCode {
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
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
