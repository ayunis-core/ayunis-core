import { createHash, createHmac } from 'node:crypto';
import { config } from '../config';

// MinIO of the stack under test: the slot's port locally, the CI service in CI.
function storage() {
  const apiPort = Number(new URL(config.apiURL).port || '3000');
  return {
    url: process.env.E2E_MINIO_URL ?? `http://localhost:${9000 + apiPort - 3000}`,
    accessKey: process.env.E2E_MINIO_ACCESS_KEY ?? 'ayunis-ci',
    secretKey: process.env.E2E_MINIO_SECRET_KEY ?? 'ayunis-ci-minio-secret',
    bucket: process.env.E2E_MINIO_BUCKET ?? 'ayunis',
  };
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const hmac = (key: Buffer | string, value: string) =>
  createHmac('sha256', key).update(value).digest();

/** Whether an object exists, asked with a SigV4-signed HEAD request. */
export async function objectExists(key: string): Promise<boolean> {
  const { url, accessKey, secretKey, bucket } = storage();
  const host = new URL(url).host;
  const path = `/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amzDate.slice(0, 8);
  const scope = `${day}/us-east-1/s3/aws4_request`;
  const payloadHash = sha256('');
  const canonicalRequest = [
    'HEAD',
    path,
    '',
    `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`,
    'host;x-amz-content-sha256;x-amz-date',
    payloadHash,
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join('\n');
  const signingKey = ['us-east-1', 's3', 'aws4_request'].reduce(
    (key, part) => hmac(key, part),
    hmac(`AWS4${secretKey}`, day),
  );
  const signature = createHmac('sha256', signingKey)
    .update(stringToSign)
    .digest('hex');
  const response = await fetch(`${url}${path}`, {
    method: 'HEAD',
    headers: {
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`,
    },
  });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`Object storage answered ${response.status}`);
  return true;
}
