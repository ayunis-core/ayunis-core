import { registerAs } from '@nestjs/config';

export const embeddingsConfig = registerAs('embeddings', () => ({
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY,
  },
}));
