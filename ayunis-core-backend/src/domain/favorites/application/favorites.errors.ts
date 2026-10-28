import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum FavoriteErrorCode {
  UNEXPECTED_FAVORITE_ERROR = 'UNEXPECTED_FAVORITE_ERROR',
}

export abstract class FavoriteError extends ApplicationError {
  constructor(
    message: string,
    code: FavoriteErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class UnexpectedFavoriteError extends FavoriteError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      'Unexpected favorite error',
      FavoriteErrorCode.UNEXPECTED_FAVORITE_ERROR,
      500,
      metadata,
    );
    this.cause = error;
  }
}
