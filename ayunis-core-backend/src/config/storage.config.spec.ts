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
    delete process.env.MINIO_INTERNAL_ENDPOINT;
    delete process.env.MINIO_INTERNAL_PORT;
    delete process.env.MINIO_INTERNAL_USE_SSL;
    delete process.env.MINIO_PUBLIC_ENDPOINT;
    delete process.env.MINIO_PUBLIC_PORT;
    delete process.env.MINIO_PUBLIC_USE_SSL;
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

  it('configures independent internal and public connections', () => {
    process.env.MINIO_INTERNAL_ENDPOINT = 'minio';
    process.env.MINIO_INTERNAL_PORT = '9000';
    process.env.MINIO_INTERNAL_USE_SSL = 'false';
    process.env.MINIO_PUBLIC_ENDPOINT = 'storage.example.com';
    process.env.MINIO_PUBLIC_PORT = '443';
    process.env.MINIO_PUBLIC_USE_SSL = 'true';

    const config = storageConfig();

    expect(config.minio.internal).toEqual({
      endPoint: 'minio',
      port: 9000,
      useSSL: false,
    });
    expect(config.minio.public).toEqual({
      endPoint: 'storage.example.com',
      port: 443,
      useSSL: true,
    });
  });
});
