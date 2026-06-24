import { appConfig } from './app.config';

describe('appConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('NODE_ENV normalization', () => {
    it('defaults blank NODE_ENV to development', () => {
      process.env.NODE_ENV = '';

      expect(appConfig().isDevelopment).toBe(true);
      expect(appConfig().isTest).toBe(false);
      expect(appConfig().isProduction).toBe(false);
    });

    it('defaults whitespace-only NODE_ENV to development', () => {
      process.env.NODE_ENV = '   ';

      expect(appConfig().isDevelopment).toBe(true);
      expect(appConfig().isTest).toBe(false);
      expect(appConfig().isProduction).toBe(false);
    });
  });

  describe('isProduction', () => {
    it('is true when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_ENVIRONMENT = 'self-hosted';

      expect(appConfig().isProduction).toBe(true);
    });

    it('is true in production regardless of APP_ENVIRONMENT', () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_ENVIRONMENT = 'cloud';

      expect(appConfig().isProduction).toBe(true);
    });

    it('is false when NODE_ENV is not production', () => {
      process.env.NODE_ENV = 'test';
      process.env.APP_ENVIRONMENT = 'self-hosted';

      expect(appConfig().isProduction).toBe(false);
    });
  });

  describe('hosting flags', () => {
    it('derives isSelfHosted and isCloudHosted from APP_ENVIRONMENT', () => {
      process.env.APP_ENVIRONMENT = 'self-hosted';
      expect(appConfig().isSelfHosted).toBe(true);
      expect(appConfig().isCloudHosted).toBe(false);

      process.env.APP_ENVIRONMENT = 'cloud';
      expect(appConfig().isSelfHosted).toBe(false);
      expect(appConfig().isCloudHosted).toBe(true);
    });
  });
});
