import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';

export enum InvitesErrorCode {
  INVITE_NOT_FOUND = 'INVITE_NOT_FOUND',
  INVITE_EXPIRED = 'INVITE_EXPIRED',
  INVITE_ALREADY_ACCEPTED = 'INVITE_ALREADY_ACCEPTED',
  INVALID_INVITE_TOKEN = 'INVALID_INVITE_TOKEN',
  INVITE_EMAIL_MISMATCH = 'INVITE_EMAIL_MISMATCH',
  UNAUTHORIZED_INVITE_ACCESS = 'UNAUTHORIZED_INVITE_ACCESS',
  INVITE_CREATION_FAILED = 'INVITE_CREATION_FAILED',
  INVITE_ROLE_ERROR = 'INVITE_ROLE_ERROR',
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
 * Error thrown when invite creation fails
 */
export class InviteCreationFailedError extends InviteError {
  constructor(reason?: string, metadata?: ErrorMetadata) {
    super(
      `Failed to create invite${reason ? `: ${reason}` : ''}`,
      InvitesErrorCode.INVITE_CREATION_FAILED,
      500,
      metadata,
    );
  }
}
