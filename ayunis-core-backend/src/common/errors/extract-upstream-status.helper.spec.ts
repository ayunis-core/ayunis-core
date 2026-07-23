import { ApplicationError } from './base.error';
import { extractUpstreamStatus } from './extract-upstream-status.helper';

class TestDomainError extends ApplicationError {
  constructor(statusCode: number) {
    super('domain failure', 'TEST_DOMAIN_ERROR', statusCode);
  }
}

describe('extractUpstreamStatus', () => {
  it('returns error.status when present (OpenAI / Anthropic SDK shape)', () => {
    const error = Object.assign(new Error('rate limited'), { status: 429 });
    expect(extractUpstreamStatus(error)).toBe(429);
  });

  it('returns error.statusCode when present (legacy SDK shape)', () => {
    const error = Object.assign(new Error('server error'), { statusCode: 500 });
    expect(extractUpstreamStatus(error)).toBe(500);
  });

  it('returns error.response.status for fetch-style errors', () => {
    const error = Object.assign(new Error('unauthorized'), {
      response: { status: 401 },
    });
    expect(extractUpstreamStatus(error)).toBe(401);
  });

  it('returns error.$metadata.httpStatusCode for AWS / Bedrock errors', () => {
    const error = Object.assign(new Error('throttled'), {
      $metadata: { httpStatusCode: 429 },
    });
    expect(extractUpstreamStatus(error)).toBe(429);
  });

  it('prefers status over statusCode when both are present', () => {
    const error = Object.assign(new Error('boom'), {
      status: 429,
      statusCode: 500,
    });
    expect(extractUpstreamStatus(error)).toBe(429);
  });

  it('falls back to response.status when status/statusCode are missing', () => {
    const error = Object.assign(new Error('boom'), {
      response: { status: 503 },
      $metadata: { httpStatusCode: 999 },
    });
    expect(extractUpstreamStatus(error)).toBe(503);
  });

  it('returns undefined when no recognized field holds a number', () => {
    const error = Object.assign(new Error('opaque'), {
      status: 'not a number',
      response: { status: '500' },
    });
    expect(extractUpstreamStatus(error)).toBeUndefined();
  });

  it('returns undefined for plain Error with no extra fields', () => {
    expect(extractUpstreamStatus(new Error('boom'))).toBeUndefined();
  });

  it('returns undefined for non-object inputs', () => {
    expect(extractUpstreamStatus(null)).toBeUndefined();
    expect(extractUpstreamStatus(undefined)).toBeUndefined();
    expect(extractUpstreamStatus('string')).toBeUndefined();
    expect(extractUpstreamStatus(429)).toBeUndefined();
  });

  it('works on plain objects, not just Error instances', () => {
    expect(extractUpstreamStatus({ status: 418 })).toBe(418);
    expect(extractUpstreamStatus({ statusCode: 502 })).toBe(502);
    expect(extractUpstreamStatus({ response: { status: 504 } })).toBe(504);
    expect(extractUpstreamStatus({ $metadata: { httpStatusCode: 403 } })).toBe(
      403,
    );
  });

  it('returns undefined for ApplicationError — its statusCode is outbound, not upstream', () => {
    // ApplicationError exposes its own `statusCode` (the outbound HTTP code).
    // Reading it as an upstream provider status would misreport a domain
    // failure (e.g., a 400 validation error) as if the provider responded 400.
    expect(extractUpstreamStatus(new TestDomainError(400))).toBeUndefined();
    expect(extractUpstreamStatus(new TestDomainError(500))).toBeUndefined();
  });
});
