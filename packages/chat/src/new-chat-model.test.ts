import { describe, expect, it } from 'vitest';
import type { PermittedLanguageModelResponseDto } from '@ayunis/api-client/schemas';
import { defaultComposerValue } from './new-chat-model';

const models = [
  { id: 'first' },
  { id: 'org-default', isDefault: true },
] as PermittedLanguageModelResponseDto[];

describe('defaultComposerValue', () => {
  it('starts a new chat in the default mode when the default is a mode', () => {
    expect(
      defaultComposerValue({ mode: 'auto', permittedModelId: 'first' }, models),
    ).toBe('mode:auto');
  });

  it('starts a new chat with the default model', () => {
    expect(
      defaultComposerValue({ mode: null, permittedModelId: 'first' }, models),
    ).toBe('first');
  });

  it('falls back to the default permitted model when no default could be loaded', () => {
    expect(defaultComposerValue(undefined, models)).toBe('org-default');
  });
});
