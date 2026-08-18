import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum ThreadPiiMasksErrorCode {
  UNEXPECTED_ERROR = 'UNEXPECTED_THREAD_PII_MASKS_ERROR',
  MASK_NOT_FOUND = 'THREAD_PII_MASK_NOT_FOUND',
}

export class UnexpectedThreadPiiMasksError extends ApplicationError {
  constructor(operation: string, metadata?: ErrorMetadata) {
    super(
      `Unexpected thread PII masks error during ${operation}`,
      ThreadPiiMasksErrorCode.UNEXPECTED_ERROR,
      500,
      { operation, ...metadata },
    );
  }
}

export class ThreadPiiMaskNotFoundError extends ApplicationError {
  constructor(threadId: string, maskId: string) {
    super(
      `PII mask ${maskId} not found in thread ${threadId}`,
      ThreadPiiMasksErrorCode.MASK_NOT_FOUND,
      404,
      { threadId, maskId },
    );
  }
}
