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
  it('bounds each request attempt with the default timeout', () => {
    azure({
      apiKey: 'azure-key',
      endpoint: 'https://my-resource.openai.azure.com',
      apiVersion: '2024-10-21',
      model: 'gpt-5.4',
    });

    expect(azureCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: DEFAULT_TIMEOUT_MS }),
    );
  });

  it('lets the host override the timeout', () => {
    azure({
      apiKey: 'azure-key',
      endpoint: 'https://my-resource.openai.azure.com',
      apiVersion: '2024-10-21',
      model: 'gpt-5.4',
      timeoutMs: 45_000,
    });

    expect(azureCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 45_000 }),
    );
  });
});
