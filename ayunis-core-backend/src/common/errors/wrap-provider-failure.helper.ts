import { ApplicationError } from './base.error';
import { extractUpstreamStatus } from './extract-upstream-status.helper';
import { classifyTransportError } from './provider-transport-error.classifier';
import type { ProviderUnavailableError } from './provider.errors';
import {
  ProviderConnectionError,
  ProviderFailureClass,
  ProviderServerError,
  ProviderTimeoutError,
} from './provider.errors';

export interface ProviderFailureSource {
  provider: string;
  modelId?: string;
}

/**
 * Single integration point for outbound adapters: wraps transport failures
 * and upstream 5xx responses in the ProviderUnavailableError family.
 *
 * Returns undefined for everything the caller should keep handling itself:
 * ApplicationError (already classified), upstream 4xx (potentially our bug —
 * must stay a distinct, first-occurrence-alerting incident), and errors that
 * are neither transport failures nor provider responses.
 */
export function wrapProviderFailure(
  error: unknown,
  source: ProviderFailureSource,
): ProviderUnavailableError | undefined {
  if (error instanceof ApplicationError) return undefined;

  const transport = classifyTransportError(error);
  if (transport) {
    const context = {
      ...source,
      underlyingCode: transport.code,
      host: transport.host,
    };
    return transport.failureClass === ProviderFailureClass.TIMEOUT
      ? new ProviderTimeoutError(context, error)
      : new ProviderConnectionError(context, error);
  }

  return wrapByUpstreamStatus(error, source);
}

function wrapByUpstreamStatus(
  error: unknown,
  source: ProviderFailureSource,
): ProviderUnavailableError | undefined {
  const status = extractUpstreamStatus(error);
  if (status === undefined) return undefined;
  const context = { ...source, upstreamStatus: status };
  if (status === 504 || status === 408) {
    return new ProviderTimeoutError(context, error);
  }
  if (status >= 500) {
    return new ProviderServerError(context, error);
  }
  return undefined;
}
