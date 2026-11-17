import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum ModelAliasErrorCode {
  MODEL_ALIAS_ALREADY_EXISTS = 'MODEL_ALIAS_ALREADY_EXISTS',
}

export class ModelAliasAlreadyExistsError extends ApplicationError {
  constructor(alias: string, metadata?: ErrorMetadata) {
    super(
      `Model alias '${alias}' is already in use`,
      ModelAliasErrorCode.MODEL_ALIAS_ALREADY_EXISTS,
      409,
      metadata,
    );
  }
}
