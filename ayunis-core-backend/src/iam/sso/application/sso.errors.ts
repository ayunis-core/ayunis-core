import type { UUID } from 'crypto';
import {
  ApplicationError,
  type ErrorMetadata,
} from 'src/common/errors/base.error';

export enum SsoErrorCode {
  INVALID_CONFIGURATION = 'SSO_INVALID_CONFIGURATION',
  CONNECTION_CONFLICT = 'SSO_CONNECTION_CONFLICT',
  CONNECTION_NOT_FOUND = 'SSO_CONNECTION_NOT_FOUND',
  CONNECTION_MUST_BE_DISABLED = 'SSO_CONNECTION_MUST_BE_DISABLED',
  CONNECTION_CHANGED = 'SSO_CONNECTION_CHANGED',
  BROKER_NOT_CONFIGURED = 'SSO_BROKER_NOT_CONFIGURED',
  BROKER_RESPONSE_INVALID = 'SSO_BROKER_RESPONSE_INVALID',
  CONNECTION_NOT_AVAILABLE = 'SSO_CONNECTION_NOT_AVAILABLE',
  LOGIN_TRANSACTION_INVALID = 'SSO_LOGIN_TRANSACTION_INVALID',
  ORGANIZATION_MISMATCH = 'SSO_ORGANIZATION_MISMATCH',
  ACCOUNT_LINK_REQUIRED = 'SSO_ACCOUNT_LINK_REQUIRED',
  ACCOUNT_LINK_CONFLICT = 'SSO_ACCOUNT_LINK_CONFLICT',
  ACCOUNT_LINK_MISMATCH = 'SSO_ACCOUNT_LINK_MISMATCH',
  JIT_PROVISIONING_DISABLED = 'SSO_JIT_PROVISIONING_DISABLED',
  INVITE_EXPIRED = 'SSO_INVITE_EXPIRED',
  UNEXPECTED = 'SSO_UNEXPECTED_ERROR',
}

export abstract class SsoError extends ApplicationError {
  constructor(
    message: string,
    code: SsoErrorCode,
    statusCode: number,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class InvalidSsoConfigurationError extends SsoError {
  constructor(field: string) {
    super(
      `Invalid SSO configuration field: ${field}`,
      SsoErrorCode.INVALID_CONFIGURATION,
      400,
      { field },
    );
  }
}

export class SsoConnectionConflictError extends SsoError {
  constructor(field: 'orgId' | 'emailDomain' | 'zitadelOrgId') {
    super(
      field === 'orgId'
        ? 'Organization already has an SSO connection'
        : `SSO connection ${field} is already assigned to another organization`,
      SsoErrorCode.CONNECTION_CONFLICT,
      409,
      { field },
    );
  }
}

export class SsoConnectionNotFoundError extends SsoError {
  constructor(orgId: UUID) {
    super(
      `SSO connection for organization '${orgId}' not found`,
      SsoErrorCode.CONNECTION_NOT_FOUND,
      404,
      { orgId },
    );
  }
}

export class SsoConnectionMustBeDisabledError extends SsoError {
  constructor(orgId: UUID) {
    super(
      `Disable SSO for organization '${orgId}' before changing its mapping`,
      SsoErrorCode.CONNECTION_MUST_BE_DISABLED,
      409,
      { orgId },
    );
  }
}

export class SsoConnectionChangedError extends SsoError {
  constructor(orgId: UUID) {
    super(
      `SSO connection for organization '${orgId}' changed; retry the operation`,
      SsoErrorCode.CONNECTION_CHANGED,
      409,
      { orgId },
    );
  }
}

export class SsoBrokerNotConfiguredError extends SsoError {
  constructor() {
    super(
      'Municipal SSO is not configured',
      SsoErrorCode.BROKER_NOT_CONFIGURED,
      503,
    );
  }
}

export class InvalidSsoBrokerResponseError extends SsoError {
  constructor(field: string) {
    super(
      'The identity broker returned an invalid authentication response',
      SsoErrorCode.BROKER_RESPONSE_INVALID,
      401,
      { field },
    );
  }
}

export class SsoConnectionNotAvailableError extends SsoError {
  constructor() {
    super(
      'SSO is not available for this organization',
      SsoErrorCode.CONNECTION_NOT_AVAILABLE,
      404,
    );
  }
}

export class InvalidSsoLoginTransactionError extends SsoError {
  constructor() {
    super(
      'SSO login transaction is invalid or expired',
      SsoErrorCode.LOGIN_TRANSACTION_INVALID,
      401,
    );
  }
}

export class SsoOrganizationMismatchError extends SsoError {
  constructor() {
    super(
      'The authenticated identity does not belong to the requested organization',
      SsoErrorCode.ORGANIZATION_MISMATCH,
      401,
    );
  }
}

export class SsoAccountLinkRequiredError extends SsoError {
  constructor() {
    super(
      'This email already has an Ayunis account and must be linked before SSO can be used',
      SsoErrorCode.ACCOUNT_LINK_REQUIRED,
      409,
    );
  }
}

export class SsoAccountLinkConflictError extends SsoError {
  constructor() {
    super(
      'This broker identity is already linked to another Ayunis account',
      SsoErrorCode.ACCOUNT_LINK_CONFLICT,
      409,
    );
  }
}

export class SsoAccountLinkMismatchError extends SsoError {
  constructor() {
    super(
      'The broker identity does not match the authenticated Ayunis account',
      SsoErrorCode.ACCOUNT_LINK_MISMATCH,
      409,
    );
  }
}

export class SsoJitProvisioningDisabledError extends SsoError {
  constructor() {
    super(
      'This organization requires an invitation before the first SSO login',
      SsoErrorCode.JIT_PROVISIONING_DISABLED,
      403,
    );
  }
}

export class SsoInviteExpiredError extends SsoError {
  constructor() {
    super(
      'The invitation for this SSO account has expired',
      SsoErrorCode.INVITE_EXPIRED,
      409,
    );
  }
}

export class UnexpectedSsoError extends SsoError {
  constructor(error: Error) {
    super('Unexpected SSO error', SsoErrorCode.UNEXPECTED, 500, { error });
  }
}
