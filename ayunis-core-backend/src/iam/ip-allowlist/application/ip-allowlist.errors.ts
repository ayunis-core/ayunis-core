import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum IpAllowlistErrorCode {
  IP_NOT_ALLOWED = 'IP_NOT_ALLOWED',
  ADMIN_LOCKOUT = 'ADMIN_LOCKOUT',
}

export class IpNotAllowedError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      "Access denied: your IP address is not in the organization's allowed range. Contact your administrator.",
      IpAllowlistErrorCode.IP_NOT_ALLOWED,
      403,
      metadata,
    );
  }
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
