import { ApplicationError } from 'src/common/errors/base.error';
import type { ErrorMetadata } from 'src/common/errors/base.error';

export enum InternetSearchErrorCode {
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
}

export abstract class InternetSearchError extends ApplicationError {
  constructor(
    message: string,
    code: InternetSearchErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class UnexpectedInternetSearchError extends InternetSearchError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(error.message, InternetSearchErrorCode.UNEXPECTED_ERROR, 500, {
      ...metadata,
      error,
    });
  }
}
