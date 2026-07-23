import { ApplicationError } from './base.error';
import {
  ProviderConnectionError,
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

  it('wraps upstream 5xx responses as ProviderServerError with the status', () => {
    const error = Object.assign(new Error('service unavailable'), {
      status: 503,
    });
    const wrapped = wrapProviderFailure(error, source);
    expect(wrapped).toBeInstanceOf(ProviderServerError);
    expect(wrapped?.context.upstreamStatus).toBe(503);
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

  it('leaves upstream 4xx alone — our-bug responses must stay distinct', () => {
    const error = Object.assign(new Error('bad request'), { status: 400 });
    expect(wrapProviderFailure(error, source)).toBeUndefined();
  });

  it('leaves unrecognized errors alone', () => {
    expect(wrapProviderFailure(new Error('boom'), source)).toBeUndefined();
  });

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
