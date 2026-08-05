import {
  ConnectionError,
  MistralError,
  RequestTimeoutError,
} from '@mistralai/mistralai/models/errors';
import { isTransientMistralError } from './mistral-transient-error';

function createMistralError(statusCode: number): MistralError {
  const response = {
    status: statusCode,
    headers: new Headers({ 'content-type': 'application/json' }),
    url: 'https://api.mistral.ai/v1/embeddings',
  } as unknown as Response;
  return new MistralError(`API error: ${statusCode}`, {
    response,
    request: {} as Request,
    body: '',
  });
}

describe('isTransientMistralError', () => {
  it('treats a client-side request timeout as transient', () => {
    expect(
      isTransientMistralError(new RequestTimeoutError('request timed out')),
    ).toBe(true);
  });

  it('treats a connection failure as transient', () => {
    expect(
      isTransientMistralError(new ConnectionError('connect ECONNREFUSED')),
    ).toBe(true);
  });

  it('treats rate limiting (429) as transient', () => {
    expect(isTransientMistralError(createMistralError(429))).toBe(true);
  });

  it('treats server errors (5xx) as transient', () => {
    expect(isTransientMistralError(createMistralError(500))).toBe(true);
    expect(isTransientMistralError(createMistralError(503))).toBe(true);
  });

  it('does not retry client errors (4xx other than 429)', () => {
    expect(isTransientMistralError(createMistralError(400))).toBe(false);
    expect(isTransientMistralError(createMistralError(422))).toBe(false);
  });

  it('does not retry unknown errors', () => {
    expect(isTransientMistralError(new Error('unrelated failure'))).toBe(false);
  });

  // The SDK's own timeout mapping only covers the fetch call; an
  // AbortSignal.timeout that fires while the response body is read escapes
  // as a raw DOMException TimeoutError (code 23) and must still be retried.
  it('treats a DOMException TimeoutError as transient', () => {
    const timeout = new DOMException(
      'The operation was aborted due to timeout',
      'TimeoutError',
    );
    expect(isTransientMistralError(timeout as unknown as Error)).toBe(true);
  });

  it('treats a bare undici headers timeout as transient', () => {
    const timeout = Object.assign(new Error('Headers Timeout Error'), {
      code: 'UND_ERR_HEADERS_TIMEOUT',
      name: 'HeadersTimeoutError',
    });
    expect(isTransientMistralError(timeout)).toBe(true);
  });

  it('treats a bare DNS failure as transient', () => {
    const dnsFailure = Object.assign(new Error('getaddrinfo EAI_AGAIN'), {
      code: 'EAI_AGAIN',
    });
    expect(isTransientMistralError(dnsFailure)).toBe(true);
  });
});
