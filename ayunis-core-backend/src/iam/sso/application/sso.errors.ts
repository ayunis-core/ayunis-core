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

export class UnexpectedSsoError extends SsoError {
  constructor(error: Error) {
    super('Unexpected SSO error', SsoErrorCode.UNEXPECTED, 500, { error });
  }
}
