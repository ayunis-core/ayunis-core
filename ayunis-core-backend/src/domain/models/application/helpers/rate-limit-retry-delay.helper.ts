import { DEFAULT_RETRY_CONFIG } from '@ayunis/agent-runtime';
import {
  wrapProviderFailure,
  type ProviderFailureSource,
} from 'src/common/errors/wrap-provider-failure.helper';
import { ProviderRequestRejectedError } from 'src/common/errors/provider.errors';

export function rateLimitRetryDelayMs(
  error: unknown,
  source: ProviderFailureSource,
): number | undefined {
  const providerError = wrapProviderFailure(error, source);
  if (!(providerError instanceof ProviderRequestRejectedError)) return;
  if (providerError.context.upstreamStatus !== 429) return;
  const { retryAfterMs } = providerError.context;
  if (retryAfterMs === undefined) return;
  if (retryAfterMs > DEFAULT_RETRY_CONFIG.retryAfter.maxWaitMs) return;
  return retryAfterMs;
}
