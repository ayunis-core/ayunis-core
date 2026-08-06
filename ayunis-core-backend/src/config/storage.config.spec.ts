import storageConfig from './storage.config';

// Production requiredness of MinIO credentials is enforced by validateEnv (see
// env.validation.spec.ts); this factory only resolves the values.
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
      process.env.MINIO_ACCESS_KEY = 'access';
      process.env.MINIO_SECRET_KEY = 'secret';

      const config = storageConfig();

      expect(config.minio.accessKey).toBe('access');
      expect(config.minio.secretKey).toBe('secret');
    });

    it('falls back to MINIO_ROOT_USER / MINIO_ROOT_PASSWORD', () => {
      process.env.MINIO_ROOT_USER = 'root-user';
      process.env.MINIO_ROOT_PASSWORD = 'root-password';

      const config = storageConfig();

      expect(config.minio.accessKey).toBe('root-user');
      expect(config.minio.secretKey).toBe('root-password');
    });

    it('does NOT fall back to the old insecure minio/minio123 defaults', () => {
      const config = storageConfig();

      expect(config.minio.accessKey).toBe('');
      expect(config.minio.secretKey).toBe('');
    });
  });
});
