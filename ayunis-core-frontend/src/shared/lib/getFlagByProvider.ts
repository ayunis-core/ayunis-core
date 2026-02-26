import type { ModelWithConfigResponseDto } from '../api';

type Provider = ModelWithConfigResponseDto['provider'];

export function getFlagByProvider(provider: Provider): string {
  switch (provider) {
    case 'otc':
    case 'ayunis':
    case 'synaforce':
    case 'ollama':
    case 'stackit':
      return `🇩🇪`;
    case 'mistral':
    case 'bedrock':
    case 'scaleway':
      return `🇪🇺`;
    case 'openai':
    case 'anthropic':
    case 'gemini':
      return `🇺🇸`;
    case 'azure':
      return `🇪🇺`;
    default:
      return '';
  }
}
