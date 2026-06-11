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

const HOSTING_FLAG: Record<HostedIn, string> = {
  [ModelProviderInfoResponseDtoHostedIn.DE]: '🇩🇪',
  [ModelProviderInfoResponseDtoHostedIn.EU]: '🇪🇺',
  [ModelProviderInfoResponseDtoHostedIn.US]: '🇺🇸',
  [ModelProviderInfoResponseDtoHostedIn.SELF_HOSTED]: '🇩🇪',
  [ModelProviderInfoResponseDtoHostedIn.AYUNIS]: '🇩🇪',
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

export function getFlagByProvider(provider: ModelProvider): string {
  const hostedIn = getHostedInByProvider(provider);
  return hostedIn ? HOSTING_FLAG[hostedIn] : '';
}

export function getHostingPriority(provider: ModelProvider): number {
  const hostedIn = getHostedInByProvider(provider);
  return hostedIn ? HOSTING_PRIORITY[hostedIn] : 3;
}
