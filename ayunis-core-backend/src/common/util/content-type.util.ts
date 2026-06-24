/**
 * Single source of truth for allowed image content types and their
 * file extensions. Callers should validate content types with
 * `isAllowedImageContentType` BEFORE calling `contentTypeToExtension`
 * to surface a domain-appropriate error; `contentTypeToExtension` itself
 * throws a generic `Error` for unsupported inputs and is not aware of
 * any domain error hierarchy.
 */
const CONTENT_TYPE_TO_EXTENSION = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
} as const;

export type AllowedImageContentType = keyof typeof CONTENT_TYPE_TO_EXTENSION;

export const ALLOWED_IMAGE_CONTENT_TYPES = Object.keys(
  CONTENT_TYPE_TO_EXTENSION,
) as AllowedImageContentType[];

export function isAllowedImageContentType(
  contentType: string,
): contentType is AllowedImageContentType {
  return (ALLOWED_IMAGE_CONTENT_TYPES as readonly string[]).includes(
    contentType.toLowerCase(),
  );
}

export function contentTypeToExtension(contentType: string): string {
  const normalized = contentType.toLowerCase();
  if (!isAllowedImageContentType(normalized)) {
    throw new Error(`Unsupported image content type: ${contentType}`);
  }
  return CONTENT_TYPE_TO_EXTENSION[normalized];
}
