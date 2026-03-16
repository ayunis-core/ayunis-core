import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

enum IpAllowlistErrorCode {
  ADMIN_LOCKOUT = 'ADMIN_LOCKOUT',
}

export class AdminLockoutError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'This change would lock you out. Your current IP address is not in the new allow list.',
      IpAllowlistErrorCode.ADMIN_LOCKOUT,
      400,
      metadata,
    );
  }
}
