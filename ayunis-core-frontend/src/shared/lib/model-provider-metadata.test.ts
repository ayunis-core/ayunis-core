import { describe, expect, it } from 'vitest';
import {
  ModelProviderInfoResponseDtoHostedIn,
  ModelProviderInfoResponseDtoProvider,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  getFlagByProvider,
  getHostedInByProvider,
  getHostingPriority,
} from './model-provider-metadata';

describe('model provider metadata', () => {
  it('returns backend hosted-in values for providers', () => {
    expect(
      getHostedInByProvider(ModelProviderInfoResponseDtoProvider.synaforce),
    ).toBe(ModelProviderInfoResponseDtoHostedIn.AYUNIS);
    expect(
      getHostedInByProvider(ModelProviderInfoResponseDtoProvider.ollama),
    ).toBe(ModelProviderInfoResponseDtoHostedIn.SELF_HOSTED);
    expect(
      getHostedInByProvider(ModelProviderInfoResponseDtoProvider.scaleway),
    ).toBe(ModelProviderInfoResponseDtoHostedIn.EU);
  });

  it('maps hosted-in values to flags used in model selectors', () => {
    expect(
      getFlagByProvider(ModelProviderInfoResponseDtoProvider.stackit),
    ).toBe('🇩🇪');
    expect(
      getFlagByProvider(ModelProviderInfoResponseDtoProvider.bedrock),
    ).toBe('🇪🇺');
    expect(getFlagByProvider(ModelProviderInfoResponseDtoProvider.openai)).toBe(
      '🇺🇸',
    );
  });

  it('degrades gracefully for providers without hosting metadata', () => {
    const unknownProvider =
      'unknown-provider' as ModelProviderInfoResponseDtoProvider;
    expect(getFlagByProvider(unknownProvider)).toBe('');
    expect(getHostingPriority(unknownProvider)).toBe(3);
  });

  it('sorts German and sovereign hosting before EU and US hosting', () => {
    expect(
      getHostingPriority(ModelProviderInfoResponseDtoProvider.ayunis),
    ).toBe(0);
    expect(getHostingPriority(ModelProviderInfoResponseDtoProvider.azure)).toBe(
      1,
    );
    expect(
      getHostingPriority(ModelProviderInfoResponseDtoProvider.gemini),
    ).toBe(2);
  });
});
