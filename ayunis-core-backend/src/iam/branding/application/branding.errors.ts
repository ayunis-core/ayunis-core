import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum BrandingErrorCode {
  BRANDING_INVALID_FILE = 'BRANDING_INVALID_FILE',
  BRANDING_INVALID_COLOR = 'BRANDING_INVALID_COLOR',
  BRANDING_INSUFFICIENT_CONTRAST = 'BRANDING_INSUFFICIENT_CONTRAST',
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

export class BrandingInvalidColorError extends ApplicationError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid primary color: ${reason}`,
      BrandingErrorCode.BRANDING_INVALID_COLOR,
      400,
      metadata,
    );
  }
}

export class BrandingInsufficientContrastError extends ApplicationError {
  constructor(contrast: number, metadata?: ErrorMetadata) {
    super(
      `Primary color contrast ${contrast.toFixed(2)}:1 fails WCAG AA (4.5:1)`,
      BrandingErrorCode.BRANDING_INSUFFICIENT_CONTRAST,
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
