import { ApplicationError } from 'src/common/errors/base.error';

export class SubscriptionSyncDisabledError extends ApplicationError {
  constructor() {
    super(
      'External subscription management is disabled',
      'EXTERNAL_SUBSCRIPTION_DISABLED',
      503,
    );
  }
}
export class StaleSubscriptionSyncError extends ApplicationError {
  constructor() {
    super(
      'Prepared subscription state has been superseded',
      'EXTERNAL_SUBSCRIPTION_STALE',
      409,
    );
  }
}
export class InvalidSubscriptionSyncError extends ApplicationError {
  constructor(reason: string) {
    super(reason, 'EXTERNAL_SUBSCRIPTION_INVALID', 422);
  }
}
export class UnexpectedSubscriptionSyncError extends ApplicationError {
  constructor(error: Error) {
    super(
      'Unexpected external subscription synchronization failure',
      'UNEXPECTED_EXTERNAL_SUBSCRIPTION',
      500,
      { error },
    );
  }
}
