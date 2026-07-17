import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum SessionsErrorCode {
  REFRESH_TOKEN_NOT_FOUND = 'REFRESH_TOKEN_NOT_FOUND',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  REFRESH_TOKEN_REUSE = 'REFRESH_TOKEN_REUSE',
  UNEXPECTED_SESSIONS_ERROR = 'UNEXPECTED_SESSIONS_ERROR',
}

export abstract class SessionsError extends ApplicationError {
  constructor(
    message: string,
    code: SessionsErrorCode,
    statusCode = 401,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

/** The presented refresh token does not match any stored token. */
export class RefreshTokenNotFoundError extends SessionsError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Refresh token not found',
      SessionsErrorCode.REFRESH_TOKEN_NOT_FOUND,
      401,
      metadata,
    );
  }
}

/** The presented refresh token exists but has expired. */
export class RefreshTokenExpiredError extends SessionsError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Refresh token expired',
      SessionsErrorCode.REFRESH_TOKEN_EXPIRED,
      401,
      metadata,
    );
  }
}

/**
 * A revoked token, or a rotated token replayed after the grace window, was
 * presented. The whole token family is revoked as a theft response.
 */
export class RefreshTokenReuseError extends SessionsError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Refresh token reuse detected',
      SessionsErrorCode.REFRESH_TOKEN_REUSE,
      401,
      metadata,
    );
  }
}

export class UnexpectedSessionsError extends SessionsError {
  constructor(error: unknown, metadata?: ErrorMetadata) {
    super(
      'An unexpected error occurred',
      SessionsErrorCode.UNEXPECTED_SESSIONS_ERROR,
      500,
      {
        error: error instanceof Error ? error.message : String(error),
        ...metadata,
      },
    );
  }
}
