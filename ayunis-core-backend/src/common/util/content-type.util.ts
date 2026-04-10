const CONTENT_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

export function contentTypeToExtension(contentType: string): string {
  const ext = CONTENT_TYPE_TO_EXTENSION[contentType.toLowerCase()];
  if (!ext) {
    throw new Error(`Unsupported image content type: ${contentType}`);
  }
  return ext;
}
