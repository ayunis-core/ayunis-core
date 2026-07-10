import { registerAs } from '@nestjs/config';

export interface StorageConfig {
  provider: 'minio' | 'other';
  defaultBucket: string;
  minio: {
    endPoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
  };
}

/**
 * Resolve MinIO credentials without an insecure default fallback.
 *
 * There used to be a hardcoded `minio` / `minio123` fallback here. A shared,
 * public default lets anyone read/write the object store if the operator
 * forgets to configure credentials, so it has been removed. In production the
 * app fails fast when the credentials are missing instead of silently booting
 * with a known-insecure identity. Outside production (dev/test) the values may
 * be empty — the MinIO client then behaves anonymously and connection errors
 * surface per request, which keeps local setups from hard-crashing.
 */
function resolveMinioCredentials(): { accessKey: string; secretKey: string } {
  const accessKey = process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER;
  const secretKey =
    process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD;

  const isProduction = (process.env.NODE_ENV ?? '').trim() === 'production';
  if (isProduction) {
    const missing: string[] = [];
    if (!accessKey) {
      missing.push('MINIO_ACCESS_KEY (or MINIO_ROOT_USER)');
    }
    if (!secretKey) {
      missing.push('MINIO_SECRET_KEY (or MINIO_ROOT_PASSWORD)');
    }
    if (missing.length > 0) {
      throw new Error(
        `Missing required MinIO credential(s): ${missing.join(', ')}. ` +
          'Set these environment variables to secure values before starting ' +
          'the application. There is no insecure default fallback.',
      );
    }
  }

  return { accessKey: accessKey ?? '', secretKey: secretKey ?? '' };
}

export default registerAs('storage', (): StorageConfig => {
  const defaultBucket = process.env.MINIO_BUCKET || 'ayunis';
  const { accessKey, secretKey } = resolveMinioCredentials();
  return {
    provider: 'minio',
    defaultBucket,
    minio: {
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey,
      secretKey,
      bucket: process.env.MINIO_BUCKET || defaultBucket,
    },
  };
});
