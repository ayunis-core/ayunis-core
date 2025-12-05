/**
 * Utility functions for computing deterministic image storage paths.
 * Path format: <orgId>/<threadId>/<messageId>/<index>.<ext>
 */

const CONTENT_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const ALLOWED_CONTENT_TYPES = Object.keys(CONTENT_TYPE_TO_EXTENSION);

export function contentTypeToExtension(contentType: string): string {
  const ext = CONTENT_TYPE_TO_EXTENSION[contentType.toLowerCase()];
  if (!ext) {
    throw new Error(`Unsupported image content type: ${contentType}`);
  }
  return ext;
}

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
