import type { UUID } from 'crypto';

/**
 * Application-layer data structure for image uploads.
 * Contains the raw binary data and metadata needed for image storage.
 */
export interface ImageUploadData {
  readonly buffer: Buffer;
  readonly contentType: string;
  readonly altText?: string;
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per image
const MAX_TOTAL_IMAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB total
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export function isAllowedImageContentType(contentType: string): boolean {
  return ALLOWED_CONTENT_TYPES.includes(contentType.toLowerCase());
}

export class CreateUserMessageCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly text?: string,
    public readonly pendingImages: ImageUploadData[] = [],
    public readonly skillInstructions?: string,
  ) {
    this.validate();
  }

  private validate(): void {
    // Validate that at least text, images, or skill instructions are provided
    if (
      !this.text?.trim() &&
      this.pendingImages.length === 0 &&
      !this.skillInstructions?.trim()
    ) {
      throw new Error(
        'Message must contain text, at least one image, or skill instructions',
      );
    }

    // Validate each image
    for (const img of this.pendingImages) {
      if (img.buffer.length > MAX_IMAGE_SIZE_BYTES) {
        throw new Error(
          `Image exceeds maximum size of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`,
        );
      }
      if (!isAllowedImageContentType(img.contentType)) {
        throw new Error(`Unsupported image content type: ${img.contentType}`);
      }
    }

    // Validate total image size
    const totalSize = this.pendingImages.reduce(
      (sum, img) => sum + img.buffer.length,
      0,
    );
    if (totalSize > MAX_TOTAL_IMAGE_SIZE_BYTES) {
      throw new Error(
        `Total image size exceeds maximum of ${MAX_TOTAL_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`,
      );
    }
  }
}
