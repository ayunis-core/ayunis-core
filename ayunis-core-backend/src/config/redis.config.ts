import { registerAs } from '@nestjs/config';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

/**
 * Redis backs BullMQ queues. In production it must run with authentication:
 * an unauthenticated Redis reachable on the network lets anyone read/modify
 * queued jobs (which can carry sensitive payloads) or run arbitrary commands.
 * The app therefore fails fast when REDIS_PASSWORD is missing in production.
 * Outside production the password is optional so local/test stacks stay simple.
 */
export const redisConfig = registerAs('redis', (): RedisConfig => {
  const password = process.env.REDIS_PASSWORD || undefined;

  const isProduction = (process.env.NODE_ENV ?? '').trim() === 'production';
  if (isProduction && !password) {
    throw new Error(
      'Missing required REDIS_PASSWORD. Redis must run with authentication ' +
        'in production; set REDIS_PASSWORD to a secure value (e.g. ' +
        '`openssl rand -hex 32`) before starting the application.',
    );
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password,
  };
});
