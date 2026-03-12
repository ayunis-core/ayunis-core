import { ApplicationError } from '../../../common/errors/base.error';

export enum PlatformConfigErrorCode {
  CONFIG_NOT_FOUND = 'PLATFORM_CONFIG_NOT_FOUND',
  INVALID_VALUE = 'PLATFORM_CONFIG_INVALID_VALUE',
}

export class PlatformConfigNotFoundError extends ApplicationError {
  constructor(key: string) {
    super(
      `Platform config '${key}' is not set`,
      PlatformConfigErrorCode.CONFIG_NOT_FOUND,
      404,
      { key },
    );
  }
}

export class PlatformConfigInvalidValueError extends ApplicationError {
  constructor(key: string, reason: string) {
    super(
      `Invalid value for platform config '${key}': ${reason}`,
      PlatformConfigErrorCode.INVALID_VALUE,
      400,
      { key, reason },
    );
  }
}
