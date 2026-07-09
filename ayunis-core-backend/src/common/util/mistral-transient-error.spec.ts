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
});
