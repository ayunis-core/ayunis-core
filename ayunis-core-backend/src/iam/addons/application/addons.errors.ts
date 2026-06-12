import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum AddonErrorCode {
  UNEXPECTED_ERROR = 'ADDON_UNEXPECTED_ERROR',
}

export class UnexpectedAddonError extends ApplicationError {
  constructor(operation: string, metadata?: ErrorMetadata) {
    super(
      `Unexpected addon error during ${operation}`,
      AddonErrorCode.UNEXPECTED_ERROR,
      500,
      { operation, ...metadata },
    );
  }
}
