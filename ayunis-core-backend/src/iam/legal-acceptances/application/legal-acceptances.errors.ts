import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum LegalAcceptanceErrorCode {
  UNEXPECTED_ERROR = 'LEGAL_ACCEPTANCE_UNEXPECTED_ERROR',
}

export abstract class LegalAcceptanceError extends ApplicationError {
  constructor(
    message: string,
    code: LegalAcceptanceErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class UnexpectedLegalAcceptanceError extends LegalAcceptanceError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      'An unexpected legal acceptance error occurred',
      LegalAcceptanceErrorCode.UNEXPECTED_ERROR,
      500,
      { ...metadata, error },
    );
  }
}
