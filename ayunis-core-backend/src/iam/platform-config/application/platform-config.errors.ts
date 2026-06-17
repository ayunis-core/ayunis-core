import { ApplicationError } from '../../../common/errors/base.error';
import type { PlatformConfigKey } from '../domain/platform-config-keys.enum';

export enum PlatformConfigErrorCode {
  CONFIG_NOT_FOUND = 'PLATFORM_CONFIG_NOT_FOUND',
  INVALID_VALUE = 'PLATFORM_CONFIG_INVALID_VALUE',
}

export class PlatformConfigNotFoundError extends ApplicationError {
  /**
   * @param key Must be a `PlatformConfigKey` enum member. Tightened at the
   *   type level so downstream consumers filtering by `metadata.key` against
   *   the enum can rely on it.
   */
  constructor(key: PlatformConfigKey) {
    super(
      `Platform config '${key}' is not set`,
      PlatformConfigErrorCode.CONFIG_NOT_FOUND,
      404,
      { key },
    );
  }
}

export class PlatformConfigInvalidValueError extends ApplicationError {
  /**
   * @param key Must be a `PlatformConfigKey` enum member, or `null` when the
   *   error does not correspond to a specific stored config row (e.g. an
   *   invalid command argument like an unknown model tier). Using `null`
   *   rather than picking an arbitrary real key prevents dashboards grouping
   *   by `metadata.key` from conflating genuine per-key corruption with
   *   command-level rejections.
   * @param reason Human-readable explanation; free-form, safe to include the
   *   offending raw value here.
   */
  constructor(key: PlatformConfigKey | null, reason: string) {
    super(
      key === null
        ? `Invalid platform config command: ${reason}`
        : `Invalid value for platform config '${key}': ${reason}`,
      PlatformConfigErrorCode.INVALID_VALUE,
      400,
      { key, reason },
    );
  }
}
