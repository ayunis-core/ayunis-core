import {
  ModelProviderInfoResponseDtoHostedIn,
  ModelProviderInfoResponseDtoProvider,
  type ModelProviderInfoResponseDtoHostedIn as HostedIn,
  type ModelProviderInfoResponseDtoProvider as ModelProvider,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

const PROVIDER_HOSTED_IN: Record<ModelProvider, HostedIn> = {
  [ModelProviderInfoResponseDtoProvider.otc]:
    ModelProviderInfoResponseDtoHostedIn.DE,
  [ModelProviderInfoResponseDtoProvider.openai]:
    ModelProviderInfoResponseDtoHostedIn.US,
  [ModelProviderInfoResponseDtoProvider.anthropic]:
    ModelProviderInfoResponseDtoHostedIn.US,
  [ModelProviderInfoResponseDtoProvider.bedrock]:
    ModelProviderInfoResponseDtoHostedIn.EU,
  [ModelProviderInfoResponseDtoProvider.mistral]:
    ModelProviderInfoResponseDtoHostedIn.EU,
  [ModelProviderInfoResponseDtoProvider.ollama]:
    ModelProviderInfoResponseDtoHostedIn.SELF_HOSTED,
  [ModelProviderInfoResponseDtoProvider.synaforce]:
    ModelProviderInfoResponseDtoHostedIn.AYUNIS,
  [ModelProviderInfoResponseDtoProvider.ayunis]:
    ModelProviderInfoResponseDtoHostedIn.AYUNIS,
  [ModelProviderInfoResponseDtoProvider.azure]:
    ModelProviderInfoResponseDtoHostedIn.EU,
  [ModelProviderInfoResponseDtoProvider.gemini]:
    ModelProviderInfoResponseDtoHostedIn.US,
  [ModelProviderInfoResponseDtoProvider.stackit]:
    ModelProviderInfoResponseDtoHostedIn.DE,
  [ModelProviderInfoResponseDtoProvider.scaleway]:
    ModelProviderInfoResponseDtoHostedIn.EU,
};

// Flag rendering uses inline SVGs (see ProviderFlag) rather than Unicode flag
// emoji: Windows (Edge/Chrome) ships no glyphs for regional-indicator emoji, so
// emoji flags render as letter pairs there. These codes select the SVG to draw.
export type ProviderFlagCode = 'DE' | 'EU' | 'US';

const HOSTING_FLAG: Record<HostedIn, ProviderFlagCode> = {
  [ModelProviderInfoResponseDtoHostedIn.DE]: 'DE',
  [ModelProviderInfoResponseDtoHostedIn.EU]: 'EU',
  [ModelProviderInfoResponseDtoHostedIn.US]: 'US',
  [ModelProviderInfoResponseDtoHostedIn.SELF_HOSTED]: 'DE',
  [ModelProviderInfoResponseDtoHostedIn.AYUNIS]: 'DE',
};

const HOSTING_PRIORITY: Record<HostedIn, number> = {
  [ModelProviderInfoResponseDtoHostedIn.DE]: 0,
  [ModelProviderInfoResponseDtoHostedIn.AYUNIS]: 0,
  [ModelProviderInfoResponseDtoHostedIn.SELF_HOSTED]: 0,
  [ModelProviderInfoResponseDtoHostedIn.EU]: 1,
  [ModelProviderInfoResponseDtoHostedIn.US]: 2,
};

export function getHostedInByProvider(
  provider: ModelProvider,
): HostedIn | undefined {
  // The API may send providers added after this build, so treat the
  // exhaustive map as sparse at runtime.
  return (PROVIDER_HOSTED_IN as Partial<Record<ModelProvider, HostedIn>>)[
    provider
  ];
}

export function getFlagCodeByProvider(
  provider: ModelProvider,
): ProviderFlagCode | null {
  const hostedIn = getHostedInByProvider(provider);
  return hostedIn ? HOSTING_FLAG[hostedIn] : null;
}

export function getHostingPriority(provider: ModelProvider): number {
  const hostedIn = getHostedInByProvider(provider);
  return hostedIn ? HOSTING_PRIORITY[hostedIn] : 3;
}
