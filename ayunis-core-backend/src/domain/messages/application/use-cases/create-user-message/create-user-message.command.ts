import { UUID } from 'crypto';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per image
const MAX_TOTAL_IMAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB total
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * Application-layer data structure for image uploads.
 * Contains the raw binary data and metadata needed for image storage.
 */
export interface ImageUploadData {
  readonly buffer: Buffer;
  readonly contentType: string;
  readonly altText?: string;
}

export function isAllowedImageContentType(contentType: string): boolean {
  return ALLOWED_CONTENT_TYPES.includes(contentType.toLowerCase());
}

export class CreateUserMessageCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly text?: string,
    public readonly pendingImages: ImageUploadData[] = [],
  ) {
    this.validate();
  }

  private validate(): void {
    // Validate that at least text or images are provided
    if (!this.text?.trim() && this.pendingImages.length === 0) {
      throw new Error('Message must contain text or at least one image');
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
