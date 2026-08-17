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

  describe('mockInference', () => {
    it('is true when NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.MOCK_INFERENCE;

      expect(appConfig().mockInference).toBe(true);
    });

    it('is true in development when MOCK_INFERENCE=true', () => {
      process.env.NODE_ENV = 'development';
      process.env.MOCK_INFERENCE = 'true';

      expect(appConfig().mockInference).toBe(true);
    });

    it('is false by default', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.MOCK_INFERENCE;

      expect(appConfig().mockInference).toBe(false);
    });

    it('refuses MOCK_INFERENCE=true in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.MOCK_INFERENCE = 'true';

      expect(() => appConfig()).toThrow(
        'MOCK_INFERENCE must not be enabled in production',
      );
    });
  });

  describe('orgEventsWebhookUrl', () => {
    it('uses the configured org events webhook URL by default', () => {
      process.env.ORG_EVENTS_WEBHOOK_URL = 'https://events.example.test/hooks';
      delete process.env.DISABLE_ORG_EVENTS_WEBHOOKS;

      expect(appConfig().orgEventsWebhookUrl).toBe(
        'https://events.example.test/hooks',
      );
    });

    it('ignores the org events webhook URL when webhooks are disabled', () => {
      process.env.ORG_EVENTS_WEBHOOK_URL = 'https://events.example.test/hooks';
      process.env.DISABLE_ORG_EVENTS_WEBHOOKS = 'true';

      expect(appConfig().orgEventsWebhookUrl).toBeUndefined();
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
