import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum AnonymizationErrorCode {
  ANONYMIZATION_FAILED = 'ANONYMIZATION_FAILED',
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
