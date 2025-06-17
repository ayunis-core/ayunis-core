import { registerAs } from '@nestjs/config';

export const evalsConfig = registerAs('evals', () => ({
  langfuse: {
    secretKey: process.env.LANGFUSE_API_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_API_URL,
    project: process.env.LANGFUSE_PROJECT,
  },
}));
