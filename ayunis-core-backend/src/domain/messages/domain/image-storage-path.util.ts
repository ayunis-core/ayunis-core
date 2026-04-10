/**
 * Utility functions for computing deterministic image storage paths.
 * Path format: <orgId>/<threadId>/<messageId>/<index>.<ext>
 */

import { contentTypeToExtension } from 'src/common/util/content-type.util';

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export function isAllowedImageContentType(contentType: string): boolean {
  return ALLOWED_CONTENT_TYPES.includes(contentType.toLowerCase());
}

export function getImageStoragePath(params: {
  orgId: string;
  threadId: string;
  messageId: string;
  index: number;
  contentType: string;
}): string {
  const ext = contentTypeToExtension(params.contentType);
  return `${params.orgId}/${params.threadId}/${params.messageId}/${params.index}${ext}`;
}
