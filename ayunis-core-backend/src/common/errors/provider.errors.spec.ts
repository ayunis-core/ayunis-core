import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';
import { ApplicationError } from './base.error';
import {
  ProviderConnectionError,
  ProviderFailureClass,
  ProviderRequestRejectedError,
  ProviderServerError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from './provider.errors';

describe('ProviderUnavailableError family', () => {
  it('uses the same stable provider+failure-class key for name and code', () => {
    // AppSignal groups HTTP-path incidents by error.name (setError) and
    // queue-path incidents by error.code (OTel recordException prefers code
    // over name) — both must carry the identical grouping key.
    const error = new ProviderConnectionError({ provider: 'openai' });
    expect(error.code).toBe('PROVIDER_UNAVAILABLE_CONNECTION_OPENAI');
    expect(error.name).toBe(error.code);
  });

  it('builds distinct grouping keys per failure class', () => {
    const provider = { provider: 'mistral' };
    expect(new ProviderConnectionError(provider).code).toBe(
      'PROVIDER_UNAVAILABLE_CONNECTION_MISTRAL',
    );
    expect(new ProviderTimeoutError(provider).code).toBe(
      'PROVIDER_UNAVAILABLE_TIMEOUT_MISTRAL',
    );
    expect(new ProviderServerError(provider).code).toBe(
      'PROVIDER_UNAVAILABLE_SERVER_MISTRAL',
    );
    expect(new ProviderRequestRejectedError(provider).code).toBe(
      'PROVIDER_UNAVAILABLE_REJECTED_MISTRAL',
    );
  });

  it('sanitizes provider names with non-alphanumeric characters', () => {
    const error = new ProviderConnectionError({ provider: 'local-ollama' });
    expect(error.code).toBe('PROVIDER_UNAVAILABLE_CONNECTION_LOCAL_OLLAMA');
  });

  it('maps connection and server failures to 502, timeouts to 504', () => {
    const provider = { provider: 'anthropic' };
    expect(new ProviderConnectionError(provider).statusCode).toBe(502);
    expect(new ProviderServerError(provider).statusCode).toBe(502);
    expect(new ProviderRequestRejectedError(provider).statusCode).toBe(502);
    expect(new ProviderTimeoutError(provider).statusCode).toBe(504);
  });

  it('converts to BadGateway / GatewayTimeout HTTP exceptions', () => {
    const provider = { provider: 'anthropic' };
    expect(new ProviderServerError(provider).toHttpException()).toBeInstanceOf(
      BadGatewayException,
    );
    expect(new ProviderTimeoutError(provider).toHttpException()).toBeInstanceOf(
      GatewayTimeoutException,
    );
  });

  it('exposes the failure class and full context for metrics and logging', () => {
    const error = new ProviderTimeoutError({
      provider: 'openai',
      modelId: 'gpt-5.2',
      host: 'api.openai.com',
      underlyingCode: 'UND_ERR_BODY_TIMEOUT',
    });
    expect(error.failureClass).toBe(ProviderFailureClass.TIMEOUT);
    expect(error.context).toEqual({
      provider: 'openai',
      modelId: 'gpt-5.2',
      host: 'api.openai.com',
      underlyingCode: 'UND_ERR_BODY_TIMEOUT',
    });
  });

  it('carries the context and original error message in metadata', () => {
    const cause = Object.assign(new Error('read ECONNRESET'), {
      code: 'ECONNRESET',
    });
    const error = new ProviderConnectionError(
      {
        provider: 'mistral',
        modelId: 'mistral-large',
        underlyingCode: 'ECONNRESET',
      },
      cause,
    );
    expect(error.metadata).toMatchObject({
      provider: 'mistral',
      modelId: 'mistral-large',
      underlyingCode: 'ECONNRESET',
      causeMessage: 'read ECONNRESET',
    });
  });

  it('records the upstream status for provider server errors', () => {
    const error = new ProviderServerError({
      provider: 'mistral',
      upstreamStatus: 503,
    });
    expect(error.context.upstreamStatus).toBe(503);
    expect(error.metadata).toMatchObject({ upstreamStatus: 503 });
  });

  it('is an ApplicationError so domain passthrough branches keep working', () => {
    const error = new ProviderConnectionError({ provider: 'openai' });
    expect(error).toBeInstanceOf(ApplicationError);
    expect(error).toBeInstanceOf(ProviderUnavailableError);
  });
});
