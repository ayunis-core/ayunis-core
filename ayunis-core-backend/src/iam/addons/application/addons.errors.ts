import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum AddonErrorCode {
  UNEXPECTED_ERROR = 'ADDON_UNEXPECTED_ERROR',
}

export class UnexpectedAddonError extends ApplicationError {
  constructor(error: Error, metadata?: ErrorMetadata);
  constructor(operation: string, metadata?: ErrorMetadata);
  constructor(errorOrOperation: Error | string, metadata?: ErrorMetadata) {
    const isError = errorOrOperation instanceof Error;
    super(
      isError
        ? `Unexpected addon error: ${errorOrOperation.message}`
        : `Unexpected addon error during ${errorOrOperation}`,
      AddonErrorCode.UNEXPECTED_ERROR,
      500,
      {
        ...(isError
          ? { error: errorOrOperation }
          : { operation: errorOrOperation }),
        ...metadata,
      },
    );
  }
}
