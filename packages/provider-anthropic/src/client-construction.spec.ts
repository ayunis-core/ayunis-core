import { describe, expect, it, beforeEach, vi } from 'vitest';

import { anthropic, DEFAULT_TIMEOUT_MS } from './anthropic-provider';
import { bedrock } from './bedrock-provider';

const anthropicCtor = vi.hoisted(() => vi.fn());
const bedrockCtor = vi.hoisted(() => vi.fn());

vi.mock('@anthropic-ai/sdk', () => ({ default: anthropicCtor }));
vi.mock('@anthropic-ai/bedrock-sdk', () => ({ default: bedrockCtor }));

beforeEach(() => {
  anthropicCtor.mockClear();
  bedrockCtor.mockClear();
});

describe('anthropic client construction', () => {
  it('bounds each request attempt with the default timeout', () => {
    anthropic({ apiKey: 'sk-ant-test', model: 'claude-sonnet-4-5' });

    expect(anthropicCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: DEFAULT_TIMEOUT_MS }),
    );
  });

  it('lets the host override the timeout', () => {
    anthropic({
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-5',
      timeoutMs: 45_000,
    });

    expect(anthropicCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 45_000 }),
    );
  });
});

describe('bedrock client construction', () => {
  it('bounds each request attempt with the default timeout (credential chain)', () => {
    bedrock({ model: 'eu.anthropic.claude-sonnet-4-6' });

    expect(bedrockCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: DEFAULT_TIMEOUT_MS }),
    );
  });

  it('bounds each request attempt with the default timeout (static keys)', () => {
    bedrock({
      model: 'eu.anthropic.claude-sonnet-4-6',
      awsAccessKey: 'AKIA-test',
      awsSecretKey: 'secret-test',
    });

    expect(bedrockCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: DEFAULT_TIMEOUT_MS }),
    );
  });

  it('lets the host override the timeout', () => {
    bedrock({ model: 'eu.anthropic.claude-sonnet-4-6', timeoutMs: 45_000 });

    expect(bedrockCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 45_000 }),
    );
  });
});
