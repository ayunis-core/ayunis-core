import { registerAs } from '@nestjs/config';

export interface StorageConfig {
  provider: 'minio' | 'other';
  defaultBucket: string;
  minio: {
    internal: MinioConnectionConfig;
    /**
     * Browser-reachable endpoint used only to sign direct-upload URLs. Falls
     * back to the internal endpoint, which is what browsers reach in local
     * development and CI.
     */
    public: MinioConnectionConfig;
    accessKey: string;
    secretKey: string;
    /**
     * Identity that signs browser upload URLs. A signed PUT is honoured as
     * CopyObject when the caller adds `x-amz-copy-source`, authorised as the
     * signer, so this must be a user that can only write under the upload
     * prefix and cannot read. Falls back to the server-side identity outside
     * production; validateEnv requires a dedicated user in production.
     */
    upload: MinioCredentials;
    bucket: string;
  };
}

interface MinioCredentials {
  accessKey: string;
  secretKey: string;
}

interface MinioConnectionConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
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
function resolveMinioCredentials(): MinioCredentials {
  const accessKey = process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER;
  const secretKey =
    process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD;

  return { accessKey: accessKey ?? '', secretKey: secretKey ?? '' };
}

function resolveUploadCredentials(
  fallback: MinioCredentials,
): MinioCredentials {
  const accessKey = process.env.MINIO_UPLOAD_ACCESS_KEY;
  const secretKey = process.env.MINIO_UPLOAD_SECRET_KEY;
  return accessKey && secretKey ? { accessKey, secretKey } : fallback;
}

function resolvePublicEndpoint(
  internal: MinioConnectionConfig,
): MinioConnectionConfig {
  const endPoint = process.env.MINIO_PUBLIC_ENDPOINT;
  if (!endPoint) return internal;
  const useSSL = process.env.MINIO_PUBLIC_USE_SSL === 'true';
  return {
    endPoint,
    port: parseInt(
      process.env.MINIO_PUBLIC_PORT || (useSSL ? '443' : '80'),
      10,
    ),
    useSSL,
  };
}

export default registerAs('storage', (): StorageConfig => {
  const defaultBucket = process.env.MINIO_BUCKET || 'ayunis';
  const credentials = resolveMinioCredentials();
  const internal: MinioConnectionConfig = {
    endPoint: process.env.MINIO_INTERNAL_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_INTERNAL_PORT || '9000', 10),
    useSSL: process.env.MINIO_INTERNAL_USE_SSL === 'true',
  };
  return {
    provider: 'minio',
    defaultBucket,
    minio: {
      internal,
      public: resolvePublicEndpoint(internal),
      ...credentials,
      upload: resolveUploadCredentials(credentials),
      bucket: process.env.MINIO_BUCKET || defaultBucket,
    },
  };
});
