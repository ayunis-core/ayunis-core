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
