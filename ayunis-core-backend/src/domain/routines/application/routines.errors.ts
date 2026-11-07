import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum RoutineErrorCode {
  ROUTINE_NOT_FOUND = 'ROUTINE_NOT_FOUND',
  ROUTINE_SUBSCRIPTION_REQUIRED = 'ROUTINE_SUBSCRIPTION_REQUIRED',
  ROUTINE_OWNER_LOCKED = 'ROUTINE_OWNER_LOCKED',
  UNEXPECTED_ROUTINE_ERROR = 'UNEXPECTED_ROUTINE_ERROR',
}

export abstract class RoutineError extends ApplicationError {
  constructor(
    message: string,
    code: RoutineErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class RoutineNotFoundError extends RoutineError {
  constructor(routineId: string, metadata?: ErrorMetadata) {
    super(
      `Routine with ID '${routineId}' not found`,
      RoutineErrorCode.ROUTINE_NOT_FOUND,
      404,
      { routineId, ...metadata },
    );
  }
}

/** The owner's organization has neither a subscription nor trial messages left. */
export class RoutineSubscriptionRequiredError extends RoutineError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'An active subscription or remaining trial messages are required to run routines',
      RoutineErrorCode.ROUTINE_SUBSCRIPTION_REQUIRED,
      403,
      metadata,
    );
  }
}

/** A locked account cannot log in, so nothing runs on its behalf either. */
export class RoutineOwnerLockedError extends RoutineError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'The routine owner’s account is locked',
      RoutineErrorCode.ROUTINE_OWNER_LOCKED,
      403,
      metadata,
    );
  }
}

export class UnexpectedRoutineError extends RoutineError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      'Unexpected routine error',
      RoutineErrorCode.UNEXPECTED_ROUTINE_ERROR,
      500,
      metadata,
    );
    this.cause = error;
  }
}
