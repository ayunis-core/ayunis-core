import { UUID } from 'crypto';
import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';

export enum TrialErrorCode {
  TRIAL_NOT_FOUND = 'TRIAL_NOT_FOUND',
  TRIAL_ALREADY_EXISTS = 'TRIAL_ALREADY_EXISTS',
  TRIAL_CAPACITY_EXCEEDED = 'TRIAL_CAPACITY_EXCEEDED',
  TRIAL_CREATION_FAILED = 'TRIAL_CREATION_FAILED',
  TRIAL_UPDATE_FAILED = 'TRIAL_UPDATE_FAILED',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
}

/**
 * Base trial error that all trial-specific errors should extend
 */
export abstract class TrialError extends ApplicationError {
  constructor(
    message: string,
    code: TrialErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

/**
 * Error thrown when a trial is not found
 */
export class TrialNotFoundError extends TrialError {
  constructor(orgId: UUID, metadata?: ErrorMetadata) {
    super(
      `Trial for organization '${orgId}' not found`,
      TrialErrorCode.TRIAL_NOT_FOUND,
      404,
      {
        orgId,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when a trial already exists for an organization
 */
export class TrialAlreadyExistsError extends TrialError {
  constructor(orgId: UUID, metadata?: ErrorMetadata) {
    super(
      `Trial for organization '${orgId}' already exists`,
      TrialErrorCode.TRIAL_ALREADY_EXISTS,
      409,
      {
        orgId,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when trial capacity is exceeded
 */
export class TrialCapacityExceededError extends TrialError {
  constructor(
    orgId: UUID,
    messagesSent: number,
    maxMessages: number,
    metadata?: ErrorMetadata,
  ) {
    super(
      `Trial capacity exceeded for organization '${orgId}': ${messagesSent}/${maxMessages} messages used`,
      TrialErrorCode.TRIAL_CAPACITY_EXCEEDED,
      403,
      {
        orgId,
        messagesSent,
        maxMessages,
        remainingMessages: maxMessages - messagesSent,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when trial creation fails
 */
export class TrialCreationFailedError extends TrialError {
  constructor(orgId: UUID, reason?: string, metadata?: ErrorMetadata) {
    super(
      `Trial creation failed for organization '${orgId}'${reason ? `: ${reason}` : ''}`,
      TrialErrorCode.TRIAL_CREATION_FAILED,
      500,
      {
        orgId,
        reason,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when trial update fails
 */
export class TrialUpdateFailedError extends TrialError {
  constructor(orgId: UUID, reason?: string, metadata?: ErrorMetadata) {
    super(
      `Trial update failed for organization '${orgId}'${reason ? `: ${reason}` : ''}`,
      TrialErrorCode.TRIAL_UPDATE_FAILED,
      500,
      {
        orgId,
        reason,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when an unexpected error occurs during trial operations
 */
export class UnexpectedTrialError extends TrialError {
  constructor(orgId: UUID, reason?: string, metadata?: ErrorMetadata) {
    super(
      `Unexpected trial error for organization '${orgId}'${reason ? `: ${reason}` : ''}`,
      TrialErrorCode.UNEXPECTED_ERROR,
      500,
      {
        orgId,
        reason,
        ...metadata,
      },
    );
  }
}
