import type { ModelWithConfigResponseDtoProvider } from '@/shared/api/generated/ayunisCoreAPI.schemas';

// Priority order: DE (0) -> EU (1) -> US (2) -> Unknown (3)
export function getHostingPriority(
  provider: ModelWithConfigResponseDtoProvider,
): number {
  switch (provider) {
    case 'otc':
    case 'ayunis':
    case 'synaforce':
    case 'ollama':
    case 'stackit':
      return 0;
    case 'mistral':
    case 'bedrock':
    case 'azure':
    case 'scaleway':
      return 1;
    case 'openai':
    case 'anthropic':
    case 'gemini':
      return 2;
    default:
      return 3;
  }
}
