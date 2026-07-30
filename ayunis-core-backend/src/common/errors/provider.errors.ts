import { ApplicationError } from './base.error';

/**
 * Failure classes for external provider (LLM / embeddings / OCR) outages.
 * Together with the provider name they form the stable AppSignal grouping
 * key, so a provider outage opens one incident per provider+class instead of
 * one per raw errno.
 */
export enum ProviderFailureClass {
  /** DNS, refused/reset connections, TLS failures */
  CONNECTION = 'CONNECTION',
  /** Socket/headers/body timeouts, upstream 504/408 */
  TIMEOUT = 'TIMEOUT',
  /** Upstream 5xx responses */
  SERVER = 'SERVER',
  /** Upstream 4xx counted as provider failure (machine-generated requests) */
  REJECTED = 'REJECTED',
}

export interface ProviderErrorContext {
  /** Provider identifier, e.g. a ModelProvider value or 'mistral' for OCR */
  provider: string;
  modelId?: string;
  /** Best-effort endpoint host extracted from the error chain */
  host?: string;
  /** Raw errno / undici / TLS code that triggered the classification */
  underlyingCode?: string;
  /** HTTP status the provider responded with, when it responded at all */
  upstreamStatus?: number;
}

export const PROVIDER_UNAVAILABLE_PREFIX = 'PROVIDER_UNAVAILABLE';

const STATUS_BY_CLASS: Record<ProviderFailureClass, number> = {
  [ProviderFailureClass.CONNECTION]: 502,
  [ProviderFailureClass.TIMEOUT]: 504,
  [ProviderFailureClass.SERVER]: 502,
  [ProviderFailureClass.REJECTED]: 502,
};

const MESSAGE_BY_CLASS: Record<ProviderFailureClass, string> = {
  [ProviderFailureClass.CONNECTION]: 'connection failed',
  [ProviderFailureClass.TIMEOUT]: 'request timed out',
  [ProviderFailureClass.SERVER]: 'returned a server error',
  [ProviderFailureClass.REJECTED]: 'rejected the request',
};

/**
 * External provider failure we cannot fix on our side. All statusCodes are
 * >= 500 so `ApplicationErrorFilter` still reports occurrences to AppSignal;
 * the no-per-occurrence-alert policy is configured AppSignal-side (rate
 * triggers), not by suppressing the report.
 */
export abstract class ProviderUnavailableError extends ApplicationError {
  readonly failureClass: ProviderFailureClass;
  readonly context: ProviderErrorContext;

  constructor(
    failureClass: ProviderFailureClass,
    context: ProviderErrorContext,
    cause?: unknown,
  ) {
    const code = groupingKey(failureClass, context.provider);
    super(
      `Provider ${context.provider} ${MESSAGE_BY_CLASS[failureClass]}`,
      code,
      STATUS_BY_CLASS[failureClass],
      {
        ...context,
        ...(cause instanceof Error && { causeMessage: cause.message }),
      },
    );
    // AppSignal groups HTTP-path incidents by `name` (setError) and queue-path
    // incidents by `code` (OTel recordException prefers code over name) —
    // overwrite the constructor-derived name so both paths share one key.
    this.name = code;
    this.failureClass = failureClass;
    this.context = context;
  }
}

export class ProviderConnectionError extends ProviderUnavailableError {
  constructor(context: ProviderErrorContext, cause?: unknown) {
    super(ProviderFailureClass.CONNECTION, context, cause);
  }
}

export class ProviderTimeoutError extends ProviderUnavailableError {
  constructor(context: ProviderErrorContext, cause?: unknown) {
    super(ProviderFailureClass.TIMEOUT, context, cause);
  }
}

export class ProviderServerError extends ProviderUnavailableError {
  constructor(context: ProviderErrorContext, cause?: unknown) {
    super(ProviderFailureClass.SERVER, context, cause);
  }
}

export class ProviderRequestRejectedError extends ProviderUnavailableError {
  constructor(context: ProviderErrorContext, cause?: unknown) {
    super(ProviderFailureClass.REJECTED, context, cause);
  }
}

function groupingKey(
  failureClass: ProviderFailureClass,
  provider: string,
): string {
  const providerKey = provider.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  return `${PROVIDER_UNAVAILABLE_PREFIX}_${failureClass}_${providerKey}`;
}
