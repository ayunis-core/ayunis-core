import { registerAs } from '@nestjs/config';

export const modelsConfig = registerAs('models', () => ({
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  ollama: {
    baseURL: process.env.OLLAMA_BASE_URL,
  },
}));
