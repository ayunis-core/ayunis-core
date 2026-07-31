import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum AcademyAccessErrorCode {
  ACADEMY_CERTIFICATE_REQUIRED = 'ACADEMY_CERTIFICATE_REQUIRED',
  UNEXPECTED_ERROR = 'ACADEMY_ACCESS_UNEXPECTED_ERROR',
}

export abstract class AcademyAccessError extends ApplicationError {
  constructor(
    message: string,
    code: AcademyAccessErrorCode,
    statusCode: number,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

/**
 * Thrown instead of returning `false` from the guard so the frontend can tell
 * this apart from every other 403 and point the user at the academy.
 */
export class AcademyCertificateRequiredError extends AcademyAccessError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Using Ayunis Core chat requires a valid KI-Führerschein certificate.',
      AcademyAccessErrorCode.ACADEMY_CERTIFICATE_REQUIRED,
      403,
      metadata,
    );
  }
}

export class UnexpectedAcademyAccessError extends AcademyAccessError {
  constructor(error: Error) {
    super(
      'Unexpected academy access error',
      AcademyAccessErrorCode.UNEXPECTED_ERROR,
      500,
      { error },
    );
  }
}
