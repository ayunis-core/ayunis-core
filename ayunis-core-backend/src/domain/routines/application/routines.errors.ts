import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  describeRoutineInternetSettingsProblem,
  type RoutineInternetSettingsProblem,
} from 'src/domain/routines/domain/routine-internet-access';
import {
  describeRoutineScheduleProblem,
  type RoutineScheduleProblem,
} from 'src/domain/routines/domain/routine-frequency';

export enum RoutineErrorCode {
  ROUTINE_NOT_FOUND = 'ROUTINE_NOT_FOUND',
  ROUTINE_SUBSCRIPTION_REQUIRED = 'ROUTINE_SUBSCRIPTION_REQUIRED',
  ROUTINE_OWNER_LOCKED = 'ROUTINE_OWNER_LOCKED',
  ROUTINE_ALREADY_CREATED = 'ROUTINE_ALREADY_CREATED',
  ROUTINE_INTEGRATION_UNAVAILABLE = 'ROUTINE_INTEGRATION_UNAVAILABLE',
  ROUTINE_INVALID_ALLOWED_DOMAINS = 'ROUTINE_INVALID_ALLOWED_DOMAINS',
  ROUTINE_INVALID_SCHEDULE = 'ROUTINE_INVALID_SCHEDULE',
  ROUTINE_CONFLICTING_MODEL_SELECTION = 'ROUTINE_CONFLICTING_MODEL_SELECTION',
  ROUTINE_MODEL_MODE_UNAVAILABLE = 'ROUTINE_MODEL_MODE_UNAVAILABLE',
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

export class RoutineAlreadyCreatedError extends RoutineError {
  constructor(sourceToolCallId: string, metadata?: ErrorMetadata) {
    super(
      'A routine was already created from this chat proposal',
      RoutineErrorCode.ROUTINE_ALREADY_CREATED,
      409,
      { sourceToolCallId, ...metadata },
    );
  }
}

/**
 * A selected integration is not enabled in the org, not connected for the
 * user, or (at run time) its server cannot be reached.
 */
export class RoutineIntegrationUnavailableError extends RoutineError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `Integration '${integrationId}' is not available`,
      RoutineErrorCode.ROUTINE_INTEGRATION_UNAVAILABLE,
      422,
      { integrationId, ...metadata },
    );
  }
}

/**
 * The allowed domains contain an entry that is not a hostname, are too many,
 * or are empty in `allowlist` mode. `reason` tells the client which.
 */
export class RoutineInvalidAllowedDomainsError extends RoutineError {
  constructor(problem: RoutineInternetSettingsProblem) {
    super(
      describeRoutineInternetSettingsProblem(problem),
      RoutineErrorCode.ROUTINE_INVALID_ALLOWED_DOMAINS,
      400,
      { ...problem },
    );
  }
}

/**
 * A schedule field is invalid, missing for its frequency, or does not belong
 * to it. Requests are checked by their DTO first, so this guards the domain.
 */
export class RoutineInvalidScheduleError extends RoutineError {
  constructor(problem: RoutineScheduleProblem) {
    super(
      describeRoutineScheduleProblem(problem),
      RoutineErrorCode.ROUTINE_INVALID_SCHEDULE,
      400,
      { ...problem },
    );
  }
}

export class RoutineConflictingModelSelectionError extends RoutineError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Provide either a model or a mode, not both',
      RoutineErrorCode.ROUTINE_CONFLICTING_MODEL_SELECTION,
      400,
      metadata,
    );
  }
}

/** No model the user may use is currently enabled in the mode's list. */
export class RoutineModelModeUnavailableError extends RoutineError {
  constructor(mode: string, metadata?: ErrorMetadata) {
    super(
      `No permitted model is currently available for mode '${mode}'`,
      RoutineErrorCode.ROUTINE_MODEL_MODE_UNAVAILABLE,
      422,
      { mode, ...metadata },
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
