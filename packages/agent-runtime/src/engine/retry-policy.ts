import { InvalidRunInputError } from '../contracts/errors';
import type { ProviderFailureFacts } from '../contracts/provider';
import {
  DEFAULT_RETRY_CONFIG,
  type ResolvedRetryConfig,
  type RetryConfig,
} from '../contracts/run-input';

const PROVIDER_FAILURE_KINDS = new Set([
  'connection',
  'timeout',
  'server',
  'rate_limit',
  'rejection',
  'abort',
  'unknown',
]);

export const resolveRetryConfig = (
  override?: RetryConfig,
  base: ResolvedRetryConfig = DEFAULT_RETRY_CONFIG,
): ResolvedRetryConfig => {
  const resolved: ResolvedRetryConfig = {
    maxRetries: override?.maxRetries ?? base.maxRetries,
    retryableProviderFailureKinds:
      override?.retryableProviderFailureKinds ??
      base.retryableProviderFailureKinds,
    backoff: { ...base.backoff, ...override?.backoff },
    retryAfter: { ...base.retryAfter, ...override?.retryAfter },
  };
  validateRetryConfig(resolved);
  return freezeRetryConfig(resolved);
};

export const providerRetryDelay = (
  config: ResolvedRetryConfig,
  failure: ProviderFailureFacts,
  retryNumber: number,
): number | undefined => {
  if (failure.kind === 'abort') return undefined;
  if (!config.retryableProviderFailureKinds.includes(failure.kind)) {
    return undefined;
  }
  const retryAfter = failure.retryAfterMs;
  if (
    retryAfter !== undefined &&
    (!Number.isFinite(retryAfter) ||
      retryAfter < 0 ||
      retryAfter > config.retryAfter.maxWaitMs)
  ) {
    return undefined;
  }
  if (
    retryAfter !== undefined &&
    config.retryAfter.precedence === 'retry_after'
  ) {
    return retryAfter;
  }
  return jitteredBackoff(config, retryNumber);
};

const jitteredBackoff = (
  config: ResolvedRetryConfig,
  retryNumber: number,
): number => {
  const exponential =
    config.backoff.initialDelayMs *
    config.backoff.multiplier ** Math.max(0, retryNumber - 1);
  const capped = Math.min(config.backoff.maxDelayMs, exponential);
  const jitter = config.backoff.jitterRatio;
  if (jitter === 0 || capped === 0) return capped;
  const factor = 1 - jitter + randomFraction() * jitter * 2;
  return Math.max(0, Math.round(capped * factor));
};

const validateRetryConfig = (config: ResolvedRetryConfig): void => {
  validateNonNegativeInteger(config.maxRetries, 'retry.maxRetries');
  validateKinds(config.retryableProviderFailureKinds);
  validateNonNegativeNumber(
    config.backoff.initialDelayMs,
    'retry.backoff.initialDelayMs',
  );
  validatePositiveNumber(config.backoff.multiplier, 'retry.backoff.multiplier');
  validateNonNegativeNumber(
    config.backoff.maxDelayMs,
    'retry.backoff.maxDelayMs',
  );
  if (
    !Number.isFinite(config.backoff.jitterRatio) ||
    config.backoff.jitterRatio < 0 ||
    config.backoff.jitterRatio > 1
  ) {
    throw new InvalidRunInputError(
      'retry.backoff.jitterRatio must be between 0 and 1',
    );
  }
  validateNonNegativeNumber(
    config.retryAfter.maxWaitMs,
    'retry.retryAfter.maxWaitMs',
  );
  if (!['retry_after', 'backoff'].includes(config.retryAfter.precedence)) {
    throw new InvalidRunInputError(
      "retry.retryAfter.precedence must be 'retry_after' or 'backoff'",
    );
  }
};

const validateKinds = (kinds: unknown): void => {
  if (!Array.isArray(kinds)) {
    throw new InvalidRunInputError(
      'retry.retryableProviderFailureKinds must be an array',
    );
  }
  const values: readonly unknown[] = kinds;
  if (
    values.some(
      (kind) => typeof kind !== 'string' || !PROVIDER_FAILURE_KINDS.has(kind),
    )
  ) {
    throw new InvalidRunInputError(
      'retry.retryableProviderFailureKinds contains an unknown category',
    );
  }
};

const validateNonNegativeInteger = (value: number, path: string): void => {
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidRunInputError(`${path} must be a non-negative integer`);
  }
};

const validateNonNegativeNumber = (value: number, path: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidRunInputError(`${path} must be a non-negative number`);
  }
};

const validatePositiveNumber = (value: number, path: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new InvalidRunInputError(`${path} must be a positive number`);
  }
};

const randomFraction = (): number => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] / 2 ** 32;
};

const freezeRetryConfig = (config: ResolvedRetryConfig): ResolvedRetryConfig =>
  Object.freeze({
    ...config,
    retryableProviderFailureKinds: Object.freeze([
      ...config.retryableProviderFailureKinds,
    ]),
    backoff: Object.freeze(config.backoff),
    retryAfter: Object.freeze(config.retryAfter),
  });
