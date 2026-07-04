import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum MfaErrorCode {
  INVALID_MFA_CODE = 'INVALID_MFA_CODE',
  MFA_LOCKED = 'MFA_LOCKED',
  MFA_ALREADY_ENABLED = 'MFA_ALREADY_ENABLED',
  MFA_NOT_ENABLED = 'MFA_NOT_ENABLED',
  MFA_REQUIRED_BY_ORG = 'MFA_REQUIRED_BY_ORG',
  MFA_PENDING_TOKEN_INVALID = 'MFA_PENDING_TOKEN_INVALID',
  MFA_ENROLLMENT_NOT_ALLOWED = 'MFA_ENROLLMENT_NOT_ALLOWED',
  MFA_SELF_RESET_NOT_ALLOWED = 'MFA_SELF_RESET_NOT_ALLOWED',
  UNEXPECTED_MFA_ERROR = 'UNEXPECTED_MFA_ERROR',
}

export class InvalidMfaCodeError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'The provided code is invalid',
      MfaErrorCode.INVALID_MFA_CODE,
      400,
      metadata,
    );
  }
}

export class MfaLockedError extends ApplicationError {
  constructor(lockedUntil: Date, metadata?: ErrorMetadata) {
    super(
      'Too many failed attempts. Two-factor authentication is temporarily locked.',
      MfaErrorCode.MFA_LOCKED,
      429,
      { lockedUntil: lockedUntil.toISOString(), ...metadata },
    );
  }
}

export class MfaAlreadyEnabledError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Two-factor authentication is already enabled',
      MfaErrorCode.MFA_ALREADY_ENABLED,
      409,
      metadata,
    );
  }
}

export class MfaNotEnabledError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Two-factor authentication is not enabled',
      MfaErrorCode.MFA_NOT_ENABLED,
      404,
      metadata,
    );
  }
}

export class MfaRequiredByOrgError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Two-factor authentication is required by your organization and cannot be disabled',
      MfaErrorCode.MFA_REQUIRED_BY_ORG,
      409,
      metadata,
    );
  }
}

/**
 * 403 (not 401) on purpose: 401 responses are intercepted by the token
 * refresh filter, which must never run for MFA pending-state failures.
 */
export class InvalidMfaPendingTokenError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'The login attempt has expired. Please sign in again.',
      MfaErrorCode.MFA_PENDING_TOKEN_INVALID,
      403,
      metadata,
    );
  }
}

export class MfaEnrollmentNotAllowedError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Enrollment is not permitted in this login state',
      MfaErrorCode.MFA_ENROLLMENT_NOT_ALLOWED,
      403,
      metadata,
    );
  }
}

export class MfaSelfResetNotAllowedError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'You cannot reset your own two-factor authentication. Disable it with a valid code instead.',
      MfaErrorCode.MFA_SELF_RESET_NOT_ALLOWED,
      403,
      metadata,
    );
  }
}

export class UnexpectedMfaError extends ApplicationError {
  constructor(error: unknown, metadata?: ErrorMetadata) {
    super(
      'An unexpected error occurred',
      MfaErrorCode.UNEXPECTED_MFA_ERROR,
      500,
      {
        error: error instanceof Error ? error.message : String(error),
        ...metadata,
      },
    );
  }
}
