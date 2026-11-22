import {
  ProviderFailureClass,
  type ProviderUnavailableError,
} from './provider.errors';
import { findProviderUnavailableError } from './report-provider-unavailable-metric.helper';

/**
 * Rejections that say the provider is overloaded rather than that the request
 * is wrong: a rate limit or a request timeout.
 */
const OVERLOAD_REJECTION_STATUSES = new Set([408, 429]);

/**
 * The provider failure in an error's cause chain that says the provider is
 * down or overloaded for now (no connection, a timeout, a server error, a
 * rate limit), so the same request may well succeed later. `undefined` for
 * every other failure, including a provider rejecting the request itself,
 * which a later attempt only repeats.
 */
export function findProviderOutage(
  error: unknown,
): ProviderUnavailableError | undefined {
  const failure = findProviderUnavailableError(error);
  if (failure?.failureClass !== ProviderFailureClass.REJECTED) return failure;
  const status = failure.context.upstreamStatus;
  return status !== undefined && OVERLOAD_REJECTION_STATUSES.has(status)
    ? failure
    : undefined;
}
