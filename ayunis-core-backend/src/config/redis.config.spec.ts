import { redisConfig } from './redis.config';

describe('redisConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reads host, port and password from the environment', () => {
    process.env.NODE_ENV = 'development';
    process.env.REDIS_HOST = 'redis';
    process.env.REDIS_PORT = '6380';
    process.env.REDIS_PASSWORD = 'secret';

    const config = redisConfig();

    expect(config.host).toBe('redis');
    expect(config.port).toBe(6380);
    expect(config.password).toBe('secret');
  });

  it('defaults to localhost:6379 with no password outside production', () => {
    process.env.NODE_ENV = 'development';

    const config = redisConfig();

    expect(config.host).toBe('localhost');
    expect(config.port).toBe(6379);
    expect(config.password).toBeUndefined();
  });

  it('throws in production when REDIS_PASSWORD is missing', () => {
    process.env.NODE_ENV = 'production';

    expect(() => redisConfig()).toThrow(/REDIS_PASSWORD/);
  });

  it('treats an empty-string password as missing in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.REDIS_PASSWORD = '';

    expect(() => redisConfig()).toThrow(/REDIS_PASSWORD/);
  });

  it('does not throw in production when REDIS_PASSWORD is set', () => {
    process.env.NODE_ENV = 'production';
    process.env.REDIS_PASSWORD = 'secret';

    expect(() => redisConfig()).not.toThrow();
  });
});
