import { ApplicationError } from 'src/common/errors/base.error';

export class InvalidFynnStateError extends ApplicationError {
  constructor(reason: string) {
    super(reason, 'INVALID_FYNN_STATE', 422);
  }
}

export class FynnEntitlementsPendingError extends ApplicationError {
  constructor() {
    super(
      'Fynn subscription entitlements are not ready',
      'FYNN_ENTITLEMENTS_PENDING',
      503,
    );
  }
}

export class FynnApiError extends ApplicationError {
  constructor() {
    super('Unable to read valid Fynn API state', 'FYNN_API_ERROR', 502);
  }
}

export class FynnConfigurationError extends ApplicationError {
  constructor() {
    super(
      'Fynn integration is not configured for this deployment',
      'FYNN_CONFIGURATION_ERROR',
      503,
    );
  }
}

export class UnexpectedFynnSyncError extends ApplicationError {
  constructor(error: Error) {
    super(
      'Unexpected Fynn synchronization failure',
      'UNEXPECTED_FYNN_SYNC_ERROR',
      500,
      { error },
    );
  }
}

export class FynnResourceNotFoundError extends ApplicationError {
  constructor() {
    super('Fynn resource no longer exists', 'FYNN_RESOURCE_NOT_FOUND', 404);
  }
}
