import storageConfig from './storage.config';

describe('storageConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MINIO_ACCESS_KEY;
    delete process.env.MINIO_SECRET_KEY;
    delete process.env.MINIO_ROOT_USER;
    delete process.env.MINIO_ROOT_PASSWORD;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('credentials', () => {
    it('reads credentials from MINIO_ACCESS_KEY / MINIO_SECRET_KEY', () => {
      process.env.NODE_ENV = 'development';
      process.env.MINIO_ACCESS_KEY = 'access';
      process.env.MINIO_SECRET_KEY = 'secret';

      const config = storageConfig();

      expect(config.minio.accessKey).toBe('access');
      expect(config.minio.secretKey).toBe('secret');
    });

    it('falls back to MINIO_ROOT_USER / MINIO_ROOT_PASSWORD', () => {
      process.env.NODE_ENV = 'development';
      process.env.MINIO_ROOT_USER = 'root-user';
      process.env.MINIO_ROOT_PASSWORD = 'root-password';

      const config = storageConfig();

      expect(config.minio.accessKey).toBe('root-user');
      expect(config.minio.secretKey).toBe('root-password');
    });

    it('does NOT fall back to the old insecure minio/minio123 defaults', () => {
      process.env.NODE_ENV = 'development';

      const config = storageConfig();

      expect(config.minio.accessKey).toBe('');
      expect(config.minio.secretKey).toBe('');
    });

    it('throws in production when credentials are missing', () => {
      process.env.NODE_ENV = 'production';

      expect(() => storageConfig()).toThrow(/MINIO_ACCESS_KEY/);
      expect(() => storageConfig()).toThrow(/MINIO_SECRET_KEY/);
    });

    it('does not throw in production when credentials are set', () => {
      process.env.NODE_ENV = 'production';
      process.env.MINIO_ROOT_USER = 'root-user';
      process.env.MINIO_ROOT_PASSWORD = 'root-password';

      expect(() => storageConfig()).not.toThrow();
    });

    it('does not throw outside production when credentials are missing', () => {
      process.env.NODE_ENV = 'test';

      expect(() => storageConfig()).not.toThrow();
    });
  });
});
