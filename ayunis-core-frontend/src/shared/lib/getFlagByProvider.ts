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
      return `🇪🇺`;
    case 'openai':
      return `🇺🇸`;
    case 'anthropic':
      return `🇺🇸`;
    default:
      return '';
  }
}
