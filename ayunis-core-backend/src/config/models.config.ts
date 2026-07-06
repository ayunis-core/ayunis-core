import { registerAs } from '@nestjs/config';

// Evaluated lazily inside the registerAs factory so env vars are read after
// ConfigModule has loaded .env files.
const mistralConfig = () => ({
  apiKey: process.env.MISTRAL_API_KEY,
  // Default must be a model with the audio_transcription capability —
  // voxtral-small only supports audio chat, not /v1/audio/transcriptions.
  transcriptionModel:
    process.env.MISTRAL_TRANSCRIPTION_MODEL ?? 'voxtral-mini-latest',
});

export const modelsConfig = registerAs('models', () => ({
  mistral: mistralConfig(),
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  bedrock: {
    awsRegion: process.env.AWS_BEDROCK_REGION,
    awsAccessKeyId: process.env.AWS_BEDROCK_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_BEDROCK_SECRET_ACCESS_KEY,
  },
  ollama: {
    baseURL: process.env.OLLAMA_BASE_URL,
  },
  synaforce: {
    baseURL:
      process.env.NODE_ENV === 'production'
        ? process.env.SYNAFORCE_BASE_URL
        : process.env.OLLAMA_BASE_URL,
  },
  ayunis: {
    baseURL: process.env.AYUNIS_BASE_URL,
    authToken: process.env.AYUNIS_AUTH_TOKEN,
  },
  otc: {
    apiKey: process.env.OTC_API_KEY,
    baseURL: 'https://llm-server.llmhub.t-systems.net/v2',
  },
  azure: {
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  stackit: {
    apiKey: process.env.STACKIT_TOKEN,
    baseURL: 'https://api.openai-compat.model-serving.eu01.onstackit.cloud/v1',
  },
  scaleway: {
    apiKey: process.env.SCALEWAY_API_KEY,
    baseURL: 'https://api.scaleway.ai/v1',
  },
}));
