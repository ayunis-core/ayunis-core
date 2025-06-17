import { registerAs } from '@nestjs/config';

export const retrievalConfig = registerAs('retrieval', () => ({
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY,
  },
}));
