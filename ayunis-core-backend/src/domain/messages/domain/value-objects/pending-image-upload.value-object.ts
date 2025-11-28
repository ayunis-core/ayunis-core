import { isAllowedImageContentType } from '../image-storage-path.util';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per image

/**
 * Value object representing an image that will be uploaded during message creation.
 * Validates size and content type at construction time.
 */
export class PendingImageUpload {
  constructor(
    public readonly buffer: Buffer,
    public readonly contentType: string,
    public readonly altText?: string,
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.buffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        `Image exceeds maximum size of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`,
      );
    }

    if (!isAllowedImageContentType(this.contentType)) {
      throw new Error(`Unsupported image content type: ${this.contentType}`);
    }
  }
}
