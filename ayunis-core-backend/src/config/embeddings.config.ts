import { registerAs } from '@nestjs/config';

export const embeddingsConfig = registerAs('embeddings', () => ({
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY,
  },
  ayunis: {
    baseURL: process.env.AYUNIS_BASE_URL,
    authToken: process.env.AYUNIS_AUTH_TOKEN,
  },
  throttle: {
    // Max concurrent embedding API calls across the whole process. Ingestion
    // and retrieval share this budget; retrieval is prioritized within it.
    // See EmbeddingsThrottleService.
    maxConcurrency: parseInt(
      process.env.EMBEDDINGS_MAX_CONCURRENCY ?? '16',
      10,
    ),
  },
}));
