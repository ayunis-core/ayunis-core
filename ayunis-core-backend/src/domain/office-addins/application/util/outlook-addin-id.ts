import { createHash } from 'node:crypto';

const ADDIN_ID_NAMESPACE = '59dd348f-12b5-4e50-9a57-c7c21789bd65';

/**
 * Microsoft 365 identifies an installed add-in by its manifest Id: a changed
 * Id is a different add-in that admins have to deploy again, and two
 * deployments with the same Id cannot be installed side by side in one
 * tenant. Deriving it from the deployment's base URL keeps it stable across
 * releases and distinct per deployment (e.g. staging and production).
 *
 * Name-based UUID (RFC 9562 version 8, SHA-256 of namespace + name).
 */
export function outlookAddinId(baseUrl: string): string {
  const hash = createHash('sha256')
    .update(ADDIN_ID_NAMESPACE)
    .update(baseUrl)
    .digest()
    .subarray(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x80;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
