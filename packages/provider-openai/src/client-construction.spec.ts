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

  it.each(['', 'not-an-endpoint', insecureEndpoint])(
    'rejects invalid endpoint %j with an actionable error',
    (endpoint) => {
      expect(() =>
        azure({ apiKey: 'azure-key', endpoint, model: 'gpt-5.4' }),
      ).toThrow(/Azure OpenAI endpoint.*absolute HTTPS URL/);
    },
  );
});
