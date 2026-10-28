import { Appsignal } from '@appsignal/nodejs';
import { ProviderUnavailableError } from './provider.errors';

const MAX_CAUSE_DEPTH = 4;
const countedFailures = new WeakSet<ProviderUnavailableError>();

export function findProviderUnavailableError(
  exception: unknown,
): ProviderUnavailableError | undefined {
  let node: unknown = exception;
  for (
    let depth = 0;
    depth < MAX_CAUSE_DEPTH && node instanceof Error;
    depth++
  ) {
    if (node instanceof ProviderUnavailableError) {
      return node;
    }
    node = node.cause;
  }
  return undefined;
}

export function reportProviderUnavailableMetric(exception: unknown): void {
  const providerFailure = findProviderUnavailableError(exception);
  if (!providerFailure || countedFailures.has(providerFailure)) {
    return;
  }

  // One classified failure may cross several reporting wrappers. Mark it
  // before the best-effort call so neither wrappers nor metric errors retry it.
  countedFailures.add(providerFailure);
  try {
    Appsignal.client
      .metrics()
      .incrementCounter('provider_unavailable_count', 1, {
        provider: providerFailure.context.provider,
      });
  } catch {
    // Telemetry must never replace or alter the business failure.
  }
}
