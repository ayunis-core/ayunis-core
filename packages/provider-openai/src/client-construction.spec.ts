import { describe, expect, it, beforeEach, vi } from 'vitest';

import { azure, DEFAULT_TIMEOUT_MS, openai } from './openai-provider';

const openaiCtor = vi.hoisted(() => vi.fn());
const azureCtor = vi.hoisted(() => vi.fn());

vi.mock('openai', () => ({ default: openaiCtor, AzureOpenAI: azureCtor }));

beforeEach(() => {
  openaiCtor.mockClear();
  azureCtor.mockClear();
});

describe('openai client construction', () => {
  it('bounds each request attempt with the default timeout', () => {
    openai({ apiKey: 'sk-test', model: 'gpt-5.4' });

    expect(openaiCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: DEFAULT_TIMEOUT_MS }),
    );
  });

  it('lets the host override the timeout', () => {
    openai({ apiKey: 'sk-test', model: 'gpt-5.4', timeoutMs: 45_000 });

    expect(openaiCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 45_000 }),
    );
  });

  it('disables SDK retries when the streaming host passes maxRetries zero', () => {
    openai({ apiKey: 'sk-test', model: 'gpt-5.4', maxRetries: 0 });

    expect(openaiCtor).toHaveBeenCalledWith(
      expect.objectContaining({ maxRetries: 0 }),
    );
  });
});

describe('openai token estimator selection', () => {
  it('counts exactly against api.openai.com', () => {
    const provider = openai({ apiKey: 'sk-test', model: 'gpt-4o-mini' });

    expect(provider.tokenEstimator).toMatchObject({
      exact: true,
      tokensPerImage: 48_169,
    });
  });

  it('only estimates against a compatible endpoint', () => {
    const provider = openai({
      apiKey: 'key',
      model: 'llama-3.3-70b-instruct',
      baseUrl: 'https://api.scaleway.ai/v1',
    });

    expect(provider.tokenEstimator).toMatchObject({
      exact: false,
      tokensPerMessage: 0,
    });
  });
});

describe('azure client construction', () => {
  const insecureEndpoint = ['http:', '//my-resource.openai.azure.com'].join('');
  it('uses the standard client with the Azure v1 base URL', () => {
    azure({
      apiKey: 'azure-key',
      endpoint: 'https://my-resource.openai.azure.com',
      model: 'gpt-5.4',
    });

    expect(openaiCtor).toHaveBeenCalledWith({
      apiKey: 'azure-key',
      baseURL: 'https://my-resource.openai.azure.com/openai/v1/',
      timeout: DEFAULT_TIMEOUT_MS,
    });
    expect(azureCtor).not.toHaveBeenCalled();
  });

  it.each([
    'https://my-resource.openai.azure.com/',
    'https://my-resource.openai.azure.com///',
  ])('handles trailing endpoint slashes in %s', (endpoint) => {
    azure({ apiKey: 'azure-key', endpoint, model: 'gpt-5.4' });

    expect(openaiCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://my-resource.openai.azure.com/openai/v1/',
      }),
    );
  });

  it('lets the host override the timeout', () => {
    azure({
      apiKey: 'azure-key',
      endpoint: 'https://my-resource.openai.azure.com',
      model: 'gpt-5.4',
      timeoutMs: 45_000,
    });

    expect(openaiCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 45_000 }),
    );
  });

  it('disables SDK retries when the streaming host passes maxRetries zero', () => {
    azure({
      apiKey: 'azure-key',
      endpoint: 'https://my-resource.openai.azure.com',
      model: 'gpt-5.4',
      maxRetries: 0,
    });

    expect(openaiCtor).toHaveBeenCalledWith(
      expect.objectContaining({ maxRetries: 0 }),
    );
  });

  it.each(['', 'not-an-endpoint', insecureEndpoint])(
    'rejects invalid endpoint %j with an actionable error',
    (endpoint) => {
      expect(() =>
        azure({ apiKey: 'azure-key', endpoint, model: 'gpt-5.4' }),
      ).toThrow(/Azure OpenAI endpoint.*absolute HTTPS URL/);
    },
  );
});

it('uses OpenAI pricing for an explicitly configured official base URL', () => {
  expect(
    openai({
      apiKey: 'key',
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1/',
    }).tokenEstimator,
  ).toMatchObject({ exact: true, tokensPerImage: 48169 });
});
it('estimates an Azure deployment alias conservatively', () => {
  expect(
    azure({
      apiKey: 'key',
      endpoint: 'https://municipality.openai.azure.com',
      model: 'chat-prod',
    }).tokenEstimator,
  ).toMatchObject({ exact: false, tokensPerImage: 48169 });
});
it('prices an Azure alias with its explicitly supplied underlying model', () => {
  expect(
    azure({
      apiKey: 'key',
      endpoint: 'https://municipality.openai.azure.com',
      model: 'chat-prod',
      underlyingModel: 'gpt-4.1',
    }).tokenEstimator,
  ).toMatchObject({ exact: true, tokensPerImage: 1445 });
});
