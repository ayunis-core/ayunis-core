import { registerAs } from '@nestjs/config';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

/**
 * Redis backs BullMQ queues. In production it must run with authentication: an
 * unauthenticated Redis reachable on the network lets anyone read/modify queued
 * jobs (which can carry sensitive payloads) or run arbitrary commands. The
 * presence of REDIS_PASSWORD in production is enforced at boot by validateEnv
 * (src/config/env.validation.ts). Outside production the password is optional so
 * local/test stacks stay simple.
 */
export const redisConfig = registerAs('redis', (): RedisConfig => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
}));
