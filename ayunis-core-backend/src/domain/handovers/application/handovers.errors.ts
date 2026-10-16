import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum HandoverErrorCode {
  HANDOVER_NOT_FOUND = 'HANDOVER_NOT_FOUND',
  HANDOVER_ALREADY_PENDING = 'HANDOVER_ALREADY_PENDING',
  HANDOVER_NOT_PENDING = 'HANDOVER_NOT_PENDING',
  HANDOVER_NOT_ALLOWED = 'HANDOVER_NOT_ALLOWED',
  HANDOVER_TARGET_NOT_FOUND = 'HANDOVER_TARGET_NOT_FOUND',
  UNEXPECTED_HANDOVER_ERROR = 'UNEXPECTED_HANDOVER_ERROR',
}

export class HandoverRequestNotFoundError extends ApplicationError {
  constructor(requestId: string, metadata?: ErrorMetadata) {
    super(
      `Handover request '${requestId}' not found`,
      HandoverErrorCode.HANDOVER_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class HandoverAlreadyPendingError extends ApplicationError {
  constructor(resourceId: string) {
    super(
      `A handover request for '${resourceId}' is already pending`,
      HandoverErrorCode.HANDOVER_ALREADY_PENDING,
      409,
    );
  }
}

export class HandoverNotPendingError extends ApplicationError {
  constructor(requestId: string) {
    super(
      `Handover request '${requestId}' is no longer pending`,
      HandoverErrorCode.HANDOVER_NOT_PENDING,
      409,
    );
  }
}

export class HandoverNotAllowedError extends ApplicationError {
  constructor(reason: string) {
    super(reason, HandoverErrorCode.HANDOVER_NOT_ALLOWED, 403);
  }
}

export class HandoverTargetNotFoundError extends ApplicationError {
  constructor(teamId: string) {
    super(
      `Team '${teamId}' not found`,
      HandoverErrorCode.HANDOVER_TARGET_NOT_FOUND,
      404,
    );
  }
}

export class UnexpectedHandoverError extends ApplicationError {
  constructor(error: unknown) {
    super(
      'Unexpected error occurred',
      HandoverErrorCode.UNEXPECTED_HANDOVER_ERROR,
      500,
      { error },
    );
  }
}
