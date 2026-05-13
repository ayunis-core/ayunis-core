import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum BrandingErrorCode {
  BRANDING_INVALID_FILE = 'BRANDING_INVALID_FILE',
  UNEXPECTED_ERROR = 'UNEXPECTED_BRANDING_ERROR',
}

export class BrandingInvalidFileError extends ApplicationError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid branding file: ${reason}`,
      BrandingErrorCode.BRANDING_INVALID_FILE,
      400,
      metadata,
    );
  }
}

export class UnexpectedBrandingError extends ApplicationError {
  constructor(operation: string, metadata?: ErrorMetadata) {
    super(
      `Unexpected branding error during ${operation}`,
      BrandingErrorCode.UNEXPECTED_ERROR,
      500,
      { operation, ...metadata },
    );
  }
}
