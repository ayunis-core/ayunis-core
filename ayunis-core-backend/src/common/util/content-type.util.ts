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

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

// Signature sniffing recognizes the header only; it does not validate the payload.
export function sniffAllowedImageContentType(
  buffer: Buffer,
): AllowedImageContentType | undefined {
  if (buffer.subarray(0, 3).equals(JPEG_SIGNATURE)) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return 'image/png';
  const ascii = buffer.subarray(0, 12).toString('latin1');
  if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')) {
    return 'image/gif';
  }
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return undefined;
}
