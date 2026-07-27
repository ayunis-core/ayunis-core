import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export enum PermissionErrorCode {
  UNEXPECTED_ERROR = 'PERMISSION_UNEXPECTED_ERROR',
  ROLE_NOT_CONFIGURABLE = 'PERMISSION_ROLE_NOT_CONFIGURABLE',
}

export abstract class PermissionError extends ApplicationError {
  constructor(
    message: string,
    code: PermissionErrorCode,
    statusCode: number,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class RoleNotConfigurableError extends PermissionError {
  constructor(role: UserRole) {
    super(
      `Permissions for role "${role}" cannot be configured`,
      PermissionErrorCode.ROLE_NOT_CONFIGURABLE,
      400,
      { role },
    );
  }
}

export class UnexpectedPermissionError extends PermissionError {
  constructor(error: Error) {
    super(
      'Unexpected permission error',
      PermissionErrorCode.UNEXPECTED_ERROR,
      500,
      { error },
    );
  }
}
