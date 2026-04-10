import {
  CreateLanguageModelRequestDtoProvider,
  CreateEmbeddingModelRequestDtoProvider,
  CreateImageGenerationModelRequestDtoProvider,
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
  scaleway: 'Scaleway',
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

/**
 * Image generation model providers derived from OpenAPI schema.
 * V1 is Azure-only by backend contract.
 */
export const IMAGE_GENERATION_MODEL_PROVIDERS = Object.values(
  CreateImageGenerationModelRequestDtoProvider,
).map((value) => ({
  value,
  label: PROVIDER_LABELS[value] ?? value,
}));
