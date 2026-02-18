import {
  CreateLanguageModelRequestDtoProvider,
  CreateEmbeddingModelRequestDtoProvider,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

/**
 * Provider display labels derived from generated schema types.
 * Single source of truth for provider dropdown options.
 */
const PROVIDER_LABELS: Record<string, string> = {
  otc: 'OTC',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  bedrock: 'AWS Bedrock',
  mistral: 'Mistral',
  ollama: 'Ollama',
  synaforce: 'Synaforce',
  ayunis: 'Ayunis',
  azure: 'MS Azure',
  gemini: 'Gemini',
  stackit: 'Stackit',
};

/**
 * Language model providers derived from OpenAPI schema.
 */
export const LANGUAGE_MODEL_PROVIDERS = Object.values(
  CreateLanguageModelRequestDtoProvider,
).map((value) => ({
  value,
  label: PROVIDER_LABELS[value] ?? value,
}));

/**
 * Embedding model providers derived from OpenAPI schema.
 */
export const EMBEDDING_MODEL_PROVIDERS = Object.values(
  CreateEmbeddingModelRequestDtoProvider,
).map((value) => ({
  value,
  label: PROVIDER_LABELS[value] ?? value,
}));
