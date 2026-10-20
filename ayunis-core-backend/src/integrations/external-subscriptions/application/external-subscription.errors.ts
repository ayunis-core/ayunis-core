import { ApplicationError } from 'src/common/errors/base.error';

export class ExternalSubscriptionDisabledError extends ApplicationError {
  constructor() {
    super(
      'External subscription management is disabled',
      'EXTERNAL_SUBSCRIPTION_DISABLED',
      503,
    );
  }
}
export class StaleExternalSubscriptionError extends ApplicationError {
  constructor() {
    super(
      'Prepared subscription state has been superseded',
      'EXTERNAL_SUBSCRIPTION_STALE',
      409,
    );
  }
}
export class InvalidExternalSubscriptionError extends ApplicationError {
  constructor(reason: string) {
    super(reason, 'EXTERNAL_SUBSCRIPTION_INVALID', 422);
  }
}
export class UnexpectedExternalSubscriptionError extends ApplicationError {
  constructor(error: Error) {
    super(
      'Unexpected external subscription synchronization failure',
      'UNEXPECTED_EXTERNAL_SUBSCRIPTION',
      500,
      { error },
    );
  }
}
