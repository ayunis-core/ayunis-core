import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum OfficeAddinErrorCode {
  UNEXPECTED_OFFICE_ADDIN_ERROR = 'UNEXPECTED_OFFICE_ADDIN_ERROR',
}

export abstract class OfficeAddinError extends ApplicationError {
  constructor(
    message: string,
    code: OfficeAddinErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class UnexpectedOfficeAddinError extends OfficeAddinError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      'Unexpected office add-in error',
      OfficeAddinErrorCode.UNEXPECTED_OFFICE_ADDIN_ERROR,
      500,
      metadata,
    );
    this.cause = error;
  }
}
