import { ModelProviderError } from '@ayunis/inference';
import { ApplicationError } from './base.error';
import {
  ProviderConnectionError,
  ProviderRequestRejectedError,
  ProviderServerError,
  ProviderTimeoutError,
} from './provider.errors';
import { wrapProviderFailure } from './wrap-provider-failure.helper';

class TestDomainError extends ApplicationError {
  constructor() {
    super('domain failure', 'TEST_DOMAIN_ERROR', 500);
  }
}

const source = { provider: 'openai', modelId: 'gpt-5.2' };

describe('wrapProviderFailure', () => {
  it('passes ApplicationError through untouched (returns undefined)', () => {
    expect(wrapProviderFailure(new TestDomainError(), source)).toBeUndefined();
  });

  it('wraps transport connection failures with provider and model metadata', () => {
    const error = Object.assign(new Error('read ECONNRESET'), {
      code: 'ECONNRESET',
    });
    const wrapped = wrapProviderFailure(error, source);
    expect(wrapped).toBeInstanceOf(ProviderConnectionError);
    expect(wrapped?.context).toMatchObject({
      provider: 'openai',
      modelId: 'gpt-5.2',
      underlyingCode: 'ECONNRESET',
    });
  });

  it('wraps transport timeouts as ProviderTimeoutError', () => {
    const error = Object.assign(new Error('headers timeout'), {
      code: 'UND_ERR_HEADERS_TIMEOUT',
    });
    expect(wrapProviderFailure(error, source)).toBeInstanceOf(
      ProviderTimeoutError,
    );
  });

  it('wraps upstream 5xx responses with safe provider diagnostics', () => {
    const error = Object.assign(new Error('service unavailable'), {
      status: 503,
      requestID: 'req_azure_503',
    });
    const wrapped = wrapProviderFailure(error, source);
    expect(wrapped).toBeInstanceOf(ProviderServerError);
    expect(wrapped?.context).toMatchObject({
      upstreamStatus: 503,
      upstreamRequestId: 'req_azure_503',
    });
  });

  it('wraps upstream 504 and 408 as ProviderTimeoutError', () => {
    const gatewayTimeout = Object.assign(new Error('gateway timeout'), {
      status: 504,
    });
    const requestTimeout = Object.assign(new Error('request timeout'), {
      status: 408,
    });
    expect(wrapProviderFailure(gatewayTimeout, source)).toBeInstanceOf(
      ProviderTimeoutError,
    );
    expect(wrapProviderFailure(requestTimeout, source)).toBeInstanceOf(
      ProviderTimeoutError,
    );
  });

  it('wraps upstream 429 responses as provider request rejections', () => {
    const error = Object.assign(new Error('rate limit exceeded'), {
      status: 429,
      requestID: 'req_azure_429',
      headers: { 'retry-after': '7' },
    });
    const wrapped = wrapProviderFailure(error, source);

    expect(wrapped).toBeInstanceOf(ProviderRequestRejectedError);
    expect(wrapped?.context).toMatchObject({
      upstreamStatus: 429,
      upstreamRequestId: 'req_azure_429',
      retryAfterMs: 7_000,
    });
  });

  it('leaves other upstream 4xx alone — our-bug responses must stay distinct', () => {
    const error = Object.assign(new Error('bad request'), { status: 400 });
    expect(wrapProviderFailure(error, source)).toBeUndefined();
  });

  it('leaves unrecognized errors alone', () => {
    expect(wrapProviderFailure(new Error('boom'), source)).toBeUndefined();
  });

  it.each([
    ['connection', ProviderConnectionError],
    ['timeout', ProviderTimeoutError],
    ['server', ProviderServerError],
    ['rate_limit', ProviderRequestRejectedError],
  ] as const)(
    'maps portable %s failures using the backend provider identity',
    (kind, expectedError) => {
      const wrapped = wrapProviderFailure(
        new ModelProviderError({
          kind,
          stage: 'stream_establishment',
          upstreamStatus: kind === 'rate_limit' ? 429 : undefined,
          upstreamRequestId: 'req_portable_123',
          retryAfterMs: kind === 'rate_limit' ? 2_000 : undefined,
          transportCode: kind === 'connection' ? 'ENETRESET' : undefined,
          host: kind === 'connection' ? 'api.example.com' : undefined,
          cause: new Error('raw provider failure with resident data'),
        }),
        { provider: 'scaleway', modelId: 'llama-3.3-70b' },
      );

      expect(wrapped).toBeInstanceOf(expectedError);
      expect(wrapped?.context).toMatchObject({
        provider: 'scaleway',
        modelId: 'llama-3.3-70b',
        upstreamRequestId: 'req_portable_123',
        ...(kind === 'connection' && {
          underlyingCode: 'ENETRESET',
          host: 'api.example.com',
        }),
      });
      expect(JSON.stringify(wrapped?.metadata)).not.toContain('resident data');
    },
  );

  it.each(['rejection', 'abort', 'unknown'] as const)(
    'leaves portable %s failures to the application boundary',
    (kind) => {
      const error = new ModelProviderError({
        kind,
        stage: 'stream_establishment',
        cause: new Error('provider failure'),
      });

      expect(wrapProviderFailure(error, source)).toBeUndefined();
    },
  );

  it('prefers the transport classification over an attached upstream status', () => {
    // An SDK error can carry both a transport code and a synthesized status;
    // the transport code is the more precise signal.
    const error = Object.assign(new Error('socket hang up'), {
      code: 'ECONNRESET',
      status: 500,
    });
    expect(wrapProviderFailure(error, source)).toBeInstanceOf(
      ProviderConnectionError,
    );
  });
});
