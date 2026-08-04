import {
  ConnectionError,
  MistralError,
  RequestTimeoutError,
} from '@mistralai/mistralai/models/errors';
import { classifyTransportError } from 'src/common/errors/provider-transport-error.classifier';

/**
 * Transient Mistral SDK failures worth a bounded retry: rate limits (429),
 * server errors (5xx), and client-side timeouts / connection failures.
 * Per-attempt `timeoutMs` on the client turns stalled connections into
 * `RequestTimeoutError`s, so retrying them is bounded — without it they
 * hang forever and never reach a retry predicate (AYC-422).
 *
 * Not everything arrives wrapped by the SDK: an AbortSignal.timeout that
 * fires while the response body is read escapes as a raw DOMException
 * TimeoutError, and undici deadlines (UND_ERR_HEADERS_TIMEOUT) or errno
 * failures (EAI_AGAIN, ECONNRESET) can reach the predicate bare — the
 * shared transport classifier recognizes those (AYC-653).
 */
export function isTransientMistralError(error: Error): boolean {
  if (
    error instanceof RequestTimeoutError ||
    error instanceof ConnectionError
  ) {
    return true;
  }
  if (classifyTransportError(error) !== undefined) {
    return true;
  }
  return (
    error instanceof MistralError &&
    (error.statusCode >= 500 || error.statusCode === 429)
  );
}
