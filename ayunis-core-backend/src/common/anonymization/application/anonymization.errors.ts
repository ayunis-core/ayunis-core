import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum AnonymizationErrorCode {
  ANONYMIZATION_FAILED = 'ANONYMIZATION_FAILED',
  INVALID_LANGUAGE = 'INVALID_LANGUAGE',
}

export abstract class AnonymizationError extends ApplicationError {
  constructor(
    message: string,
    code: AnonymizationErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class AnonymizationFailedError extends AnonymizationError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Anonymization failed: ${reason}`,
      AnonymizationErrorCode.ANONYMIZATION_FAILED,
      500,
      metadata,
    );
  }
}

export class InvalidLanguageError extends AnonymizationError {
  constructor(language: string, metadata?: ErrorMetadata) {
    super(
      `Invalid language: ${language}. Supported languages are 'en' and 'de'.`,
      AnonymizationErrorCode.INVALID_LANGUAGE,
      400,
      metadata,
    );
  }
}
