import { registerAs } from '@nestjs/config';

export const webConfig = registerAs('web', () => ({
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS || '',
  },
}));
