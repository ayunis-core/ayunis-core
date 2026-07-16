import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum ThreadPiiMasksErrorCode {
  UNEXPECTED_ERROR = 'UNEXPECTED_THREAD_PII_MASKS_ERROR',
}

export class UnexpectedThreadPiiMasksError extends ApplicationError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(error.message, ThreadPiiMasksErrorCode.UNEXPECTED_ERROR, 500, {
      ...metadata,
      error,
    });
  }
}
