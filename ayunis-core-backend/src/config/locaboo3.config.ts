import { registerAs } from '@nestjs/config';

export const locaboo3Config = registerAs('locaboo3', () => ({
  baseUrl: process.env.LOCABOO3_BASE_URL,
}));
