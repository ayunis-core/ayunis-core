import type { ModelWithConfigResponseDto } from '../api';

type Provider = ModelWithConfigResponseDto['provider'];

export function getFlagByProvider(provider: Provider): string {
  switch (provider) {
    case 'otc':
    case 'ayunis':
    case 'synaforce':
    case 'ollama':
      return `🇩🇪`;
    case 'mistral':
    case 'bedrock':
      return `🇪🇺`;
    case 'openai':
      return `🇺🇸`;
    case 'anthropic':
      return `🇺🇸`;
    case 'azure':
      return `🇪🇺`;
    default:
      return '';
  }
}
