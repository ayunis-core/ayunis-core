import type { UUID } from 'crypto';
import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

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
  constructor(error: Error, metadata?: ErrorMetadata);
  constructor(orgId: UUID, reason?: string, metadata?: ErrorMetadata);
  // The overload preserves the legacy org/reason API while accepting Error causes.
  // eslint-disable-next-line complexity
  constructor(
    errorOrOrgId: Error | UUID,
    reasonOrMetadata?: string | ErrorMetadata,
    metadata?: ErrorMetadata,
  ) {
    const isError = errorOrOrgId instanceof Error;
    const orgId = isError ? undefined : errorOrOrgId;
    const reason = isError
      ? undefined
      : typeof reasonOrMetadata === 'string'
        ? reasonOrMetadata
        : undefined;
    const errorMetadata = isError
      ? reasonOrMetadata && typeof reasonOrMetadata !== 'string'
        ? reasonOrMetadata
        : metadata
      : metadata;
    super(
      isError
        ? `Unexpected trial error: ${errorOrOrgId.message}`
        : `Unexpected trial error for organization '${orgId}'${reason ? `: ${reason}` : ''}`,
      TrialErrorCode.UNEXPECTED_ERROR,
      500,
      {
        ...(orgId && { orgId }),
        ...(reason && { reason }),
        ...(isError && { error: errorOrOrgId }),
        ...errorMetadata,
      },
    );
  }
}
