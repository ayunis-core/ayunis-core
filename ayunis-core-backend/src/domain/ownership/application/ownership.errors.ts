import { ApplicationError } from 'src/common/errors/base.error';

export enum OwnershipErrorCode {
  UNEXPECTED_OWNERSHIP_ERROR = 'UNEXPECTED_OWNERSHIP_ERROR',
}

export class UnexpectedOwnershipError extends ApplicationError {
  constructor(error: unknown) {
    super(
      'Unexpected error occurred',
      OwnershipErrorCode.UNEXPECTED_OWNERSHIP_ERROR,
      500,
      { error },
    );
  }
}
