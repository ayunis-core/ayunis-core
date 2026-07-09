import {
  ConnectionError,
  MistralError,
  RequestTimeoutError,
} from '@mistralai/mistralai/models/errors';

/**
 * Transient Mistral SDK failures worth a bounded retry: rate limits (429),
 * server errors (5xx), and client-side timeouts / connection failures.
 * Per-attempt `timeoutMs` on the client turns stalled connections into
 * `RequestTimeoutError`s, so retrying them is bounded — without it they
 * hang forever and never reach a retry predicate (AYC-422).
 */
export function isTransientMistralError(error: Error): boolean {
  if (
    error instanceof RequestTimeoutError ||
    error instanceof ConnectionError
  ) {
    return true;
  }
  return (
    error instanceof MistralError &&
    (error.statusCode >= 500 || error.statusCode === 429)
  );
}
