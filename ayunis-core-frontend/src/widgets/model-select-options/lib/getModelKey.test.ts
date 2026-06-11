import { describe, expect, it } from 'vitest';
import { getModelKey, getModelKeyFallbacks } from './getModelKey';

describe('getModelKey', () => {
  it('normalizes model names for translation keys', () => {
    expect(getModelKey('gpt-5.1')).toBe('gpt-5_1');
    expect(getModelKey('Claude/Opus 4.7')).toBe('claude_opus_4_7');
  });
});

describe('getModelKeyFallbacks', () => {
  it('returns suffix fallbacks without hard-coded provider prefixes', () => {
    expect(getModelKeyFallbacks('eu.anthropic.claude-opus-4-7')).toEqual([
      'eu_anthropic_claude-opus-4-7',
      'anthropic_claude-opus-4-7',
      'claude-opus-4-7',
    ]);
  });
});
