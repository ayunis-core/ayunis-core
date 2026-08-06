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
 * There is intentionally no hardcoded `minio` / `minio123` fallback: a shared,
 * public default lets anyone read/write the object store if the operator
 * forgets to configure credentials. Their presence in production is enforced at
 * boot by validateEnv (src/config/env.validation.ts). Outside production
 * (dev/test) the values may be empty — the MinIO client then behaves
 * anonymously and connection errors surface per request, which keeps local
 * setups from hard-crashing.
 */
function resolveMinioCredentials(): { accessKey: string; secretKey: string } {
  const accessKey = process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER;
  const secretKey =
    process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD;

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
