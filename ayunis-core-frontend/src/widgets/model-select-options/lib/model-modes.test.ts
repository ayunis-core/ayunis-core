import { describe, expect, it } from 'vitest';
import {
  ModelProviderInfoResponseDtoProvider,
  PermittedLanguageModelResponseDtoTier,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { getModeValue, resolveSelectedModel } from './model-modes';

const baseModel = {
  provider: ModelProviderInfoResponseDtoProvider.stackit,
  hasProviderFault: false,
  anonymousOnly: false,
};

const strong = {
  ...baseModel,
  id: 'strong',
  displayName: 'Strong',
  tier: PermittedLanguageModelResponseDtoTier.high,
};
const balanced = {
  ...baseModel,
  id: 'balanced',
  displayName: 'Balanced',
  tier: PermittedLanguageModelResponseDtoTier.medium,
};

describe(resolveSelectedModel.name, () => {
  it('keeps a concrete model id even before models are loaded', () => {
    expect(resolveSelectedModel('some-model-id', [])).toEqual({
      model: undefined,
      modelId: 'some-model-id',
      isMode: false,
    });
  });

  it('resolves auto to a concrete permitted model id', () => {
    const result = resolveSelectedModel(getModeValue('auto'), [
      balanced,
      strong,
    ]);
    expect(result.modelId).toBe('strong');
    expect(result.model).toBe(strong);
  });

  it('resolves max only to a strong model', () => {
    expect(
      resolveSelectedModel(getModeValue('max'), [balanced]).modelId,
    ).toBeUndefined();
  });

  it('never returns the mode value as model id', () => {
    expect(resolveSelectedModel(getModeValue('auto'), []).modelId).toBe(
      undefined,
    );
  });

  it('skips anonymous-only models unless anonymous mode is on', () => {
    const anonymousStrong = { ...strong, anonymousOnly: true };
    expect(
      resolveSelectedModel(getModeValue('max'), [anonymousStrong]).modelId,
    ).toBeUndefined();
    expect(
      resolveSelectedModel(getModeValue('max'), [anonymousStrong], true)
        .modelId,
    ).toBe('strong');
  });

  it('falls back to a disrupted model in auto rather than an anonymous-only one', () => {
    const faulted = { ...balanced, hasProviderFault: true };
    const anonymousOnly = { ...strong, anonymousOnly: true };
    const result = resolveSelectedModel(getModeValue('auto'), [
      anonymousOnly,
      faulted,
    ]);
    expect(result.modelId).toBe('balanced');
    expect(result.isMode).toBe(true);
  });

  it('resolves nothing in auto when only anonymous-only models exist', () => {
    const anonymousOnly = { ...strong, anonymousOnly: true };
    expect(
      resolveSelectedModel(getModeValue('auto'), [anonymousOnly]).modelId,
    ).toBeUndefined();
  });
});
