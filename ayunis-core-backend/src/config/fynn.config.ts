import { registerAs } from '@nestjs/config';

export const fynnConfig = registerAs('fynn', () => ({
  apiKey: process.env.FYNN_API_KEY,
  baseUrl: process.env.FYNN_API_BASE_URL,
  timeoutMs: 10_000,
}));
