import { registerAs } from '@nestjs/config';

export interface RedisConfig {
  host: string;
  port: number;
}

export const redisConfig = registerAs(
  'redis',
  (): RedisConfig => ({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  }),
);
