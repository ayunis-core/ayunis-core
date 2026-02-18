import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';

export enum InvitesErrorCode {
  INVITE_NOT_FOUND = 'INVITE_NOT_FOUND',
  INVITE_EXPIRED = 'INVITE_EXPIRED',
  INVITE_NOT_EXPIRED = 'INVITE_NOT_EXPIRED',
  INVITE_ALREADY_ACCEPTED = 'INVITE_ALREADY_ACCEPTED',
  INVALID_INVITE_TOKEN = 'INVALID_INVITE_TOKEN',
  INVITE_EMAIL_MISMATCH = 'INVITE_EMAIL_MISMATCH',
  UNAUTHORIZED_INVITE_ACCESS = 'UNAUTHORIZED_INVITE_ACCESS',
  INVITE_ROLE_ERROR = 'INVITE_ROLE_ERROR',
  INVALID_SEATS = 'INVALID_SEATS',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  INVITE_EMAIL_SENDING_FAILED = 'INVITE_EMAIL_SENDING_FAILED',
  EMAIL_NOT_AVAILABLE = 'EMAIL_NOT_AVAILABLE',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  UNEXPECTED_INVITE_ERROR = 'UNEXPECTED_INVITE_ERROR',
  BULK_INVITE_VALIDATION_FAILED = 'BULK_INVITE_VALIDATION_FAILED',
}

/**
 * Base invite error that all invite-specific errors should extend
 */
export abstract class InviteError extends ApplicationError {
  constructor(
    message: string,
    code: InvitesErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

/**
 * Error thrown when an invite is not found
 */
export class InviteNotFoundError extends InviteError {
  constructor(inviteId: string, metadata?: ErrorMetadata) {
    super(
      `Invite with ID '${inviteId}' not found`,
      InvitesErrorCode.INVITE_NOT_FOUND,
      404,
      {
        inviteId,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when an invite has expired
 */
export class InviteExpiredError extends InviteError {
  constructor(metadata?: ErrorMetadata) {
    super('Invite has expired', InvitesErrorCode.INVITE_EXPIRED, 400, metadata);
  }
}

/**
 * Error thrown when trying to resend an invite that has not expired yet
 */
export class InviteNotExpiredError extends InviteError {
  constructor(inviteId: string, metadata?: ErrorMetadata) {
    super(
      `Invite with ID '${inviteId}' has not expired yet`,
      InvitesErrorCode.INVITE_NOT_EXPIRED,
      400,
      {
        inviteId,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when an invite has already been accepted
 */
export class InviteAlreadyAcceptedError extends InviteError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Invite has already been accepted',
      InvitesErrorCode.INVITE_ALREADY_ACCEPTED,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when an invite has an invalid role
 */
export class InviteRoleError extends InviteError {
  constructor(role: UserRole, metadata?: ErrorMetadata) {
    super(
      `Invalid invite role: ${role}`,
      InvitesErrorCode.INVITE_ROLE_ERROR,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when an invite token is invalid
 */
export class InvalidInviteTokenError extends InviteError {
  constructor(reason?: string, metadata?: ErrorMetadata) {
    super(
      `Invalid invite token${reason ? `: ${reason}` : ''}`,
      InvitesErrorCode.INVALID_INVITE_TOKEN,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when user tries to access an invite they're not authorized for
 */
export class UnauthorizedInviteAccessError extends InviteError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Unauthorized access to invite',
      InvitesErrorCode.UNAUTHORIZED_INVITE_ACCESS,
      403,
      metadata,
    );
  }
}

/**
 * Error thrown when seats are invalid
 */
export class InvalidSeatsError extends InviteError {
  constructor(metadata?: ErrorMetadata) {
    super('Invalid seats', InvitesErrorCode.INVALID_SEATS, 400, metadata);
  }
}

export class InvalidPasswordError extends InviteError {
  constructor(reason?: string, metadata?: ErrorMetadata) {
    super(
      `Invalid password${reason ? `: ${reason}` : ''}`,
      InvitesErrorCode.INVALID_PASSWORD,
      400,
      metadata,
    );
  }
}

export class EmailNotAvailableError extends InviteError {
  constructor(reason?: string, metadata?: ErrorMetadata) {
    super(
      `Email not available${reason ? `: ${reason}` : ''}`,
      InvitesErrorCode.EMAIL_NOT_AVAILABLE,
      400,
      metadata,
    );
  }
}

export class UserAlreadyExistsError extends InviteError {
  constructor(reason?: string, metadata?: ErrorMetadata) {
    super(
      `User already exists${reason ? `: ${reason}` : ''}`,
      InvitesErrorCode.USER_ALREADY_EXISTS,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when sending invitation email fails
 */
export class InviteEmailSendingFailedError extends InviteError {
  constructor(reason?: string, metadata?: ErrorMetadata) {
    super(
      `Failed to send invitation email${reason ? `: ${reason}` : ''}`,
      InvitesErrorCode.INVITE_EMAIL_SENDING_FAILED,
      500,
      metadata,
    );
  }
}

/**
 * Error thrown when an unexpected error occurs
 */
export class UnexpectedInviteError extends InviteError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      `Unexpected invite error: ${error.message}`,
      InvitesErrorCode.UNEXPECTED_INVITE_ERROR,
      500,
      metadata,
    );
  }
}

/**
 * Error thrown when bulk invite validation fails for one or more rows
 */
export class BulkInviteValidationFailedError extends InviteError {
  constructor(
    errors: Array<{
      row: number;
      email: string;
      errorCode: string;
      message: string;
    }>,
    metadata?: ErrorMetadata,
  ) {
    super(
      'Bulk invite validation failed',
      InvitesErrorCode.BULK_INVITE_VALIDATION_FAILED,
      400,
      { errors, ...metadata },
    );
  }
}
