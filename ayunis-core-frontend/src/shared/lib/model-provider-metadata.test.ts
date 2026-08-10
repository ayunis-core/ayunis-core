import { describe, expect, it } from 'vitest';
import {
  ModelProviderInfoResponseDtoHostedIn,
  ModelProviderInfoResponseDtoProvider,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  getFlagCodeByProvider,
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

  it('maps hosted-in values to flag codes used in model selectors', () => {
    expect(
      getFlagCodeByProvider(ModelProviderInfoResponseDtoProvider.stackit),
    ).toBe('DE');
    expect(
      getFlagCodeByProvider(ModelProviderInfoResponseDtoProvider.bedrock),
    ).toBe('EU');
    expect(
      getFlagCodeByProvider(ModelProviderInfoResponseDtoProvider.openai),
    ).toBe('US');
  });

  it('degrades gracefully for providers without hosting metadata', () => {
    const unknownProvider =
      'unknown-provider' as ModelProviderInfoResponseDtoProvider;
    expect(getFlagCodeByProvider(unknownProvider)).toBeNull();
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
