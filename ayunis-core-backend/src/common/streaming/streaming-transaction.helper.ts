import { setNamespace } from '@appsignal/nodejs';

/**
 * A streaming response stays open for the whole model run, so its duration
 * measures how long the run took, not how responsive the API is. Reporting
 * those requests under their own AppSignal namespace keeps them out of the
 * `web` p95 and error-rate triggers (AYC-1123).
 */
export const STREAMING_NAMESPACE = 'streaming';

export function markStreamingTransaction(): void {
  setNamespace(STREAMING_NAMESPACE);
}
