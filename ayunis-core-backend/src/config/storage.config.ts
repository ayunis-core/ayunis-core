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

export default registerAs('storage', (): StorageConfig => {
  const defaultBucket = process.env.MINIO_BUCKET || 'ayunis';
  return {
    provider: 'minio',
    defaultBucket,
    minio: {
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey:
        process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'minio',
      secretKey:
        process.env.MINIO_SECRET_KEY ||
        process.env.MINIO_ROOT_PASSWORD ||
        'minio123',
      bucket: process.env.MINIO_BUCKET || defaultBucket,
    },
  };
});
