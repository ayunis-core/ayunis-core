import { redisConfig } from './redis.config';

// Production requiredness of REDIS_PASSWORD is enforced by validateEnv (see
// env.validation.spec.ts); this factory only reads values.
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
    process.env.REDIS_HOST = 'redis';
    process.env.REDIS_PORT = '6380';
    process.env.REDIS_PASSWORD = 'secret';

    const config = redisConfig();

    expect(config.host).toBe('redis');
    expect(config.port).toBe(6380);
    expect(config.password).toBe('secret');
  });

  it('defaults to localhost:6379 with no password when unset', () => {
    const config = redisConfig();

    expect(config.host).toBe('localhost');
    expect(config.port).toBe(6379);
    expect(config.password).toBeUndefined();
  });
});
