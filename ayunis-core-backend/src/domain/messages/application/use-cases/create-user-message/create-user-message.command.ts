import type { UUID } from 'crypto';
import { MessageContentInvalidError } from 'src/domain/messages/application/messages.errors';
import { MAX_IMAGE_SIZE_BYTES } from 'src/domain/messages/application/util/provider-image-limit.helper';
import {
  detectAllowedImageContentType,
  isAllowedImageContentType,
} from 'src/common/util/content-type.util';

/**
 * Application-layer data structure for image uploads.
 * Contains the raw binary data and metadata needed for image storage.
 */
export interface ImageUploadData {
  readonly buffer: Buffer;
  readonly contentType: string;
  readonly altText?: string;
}

const MAX_TOTAL_IMAGE_SIZE_BYTES = 50 * 1024 * 1024;

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
      throw new MessageContentInvalidError(
        'Message must contain text, at least one image, or skill instructions',
      );
    }

    // Validate each image
    for (const img of this.pendingImages) {
      if (img.buffer.length > MAX_IMAGE_SIZE_BYTES) {
        throw new MessageContentInvalidError(
          `Image exceeds maximum size of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)} MiB`,
        );
      }
      if (!isAllowedImageContentType(img.contentType)) {
        throw new MessageContentInvalidError(
          `Unsupported image content type: ${img.contentType}`,
        );
      }
      if (
        detectAllowedImageContentType(img.buffer) !==
        img.contentType.toLowerCase()
      ) {
        throw new MessageContentInvalidError(
          `Image bytes do not match the declared content type ${img.contentType}`,
        );
      }
    }

    // Validate total image size
    const totalSize = this.pendingImages.reduce(
      (sum, img) => sum + img.buffer.length,
      0,
    );
    if (totalSize > MAX_TOTAL_IMAGE_SIZE_BYTES) {
      throw new MessageContentInvalidError(
        `Total image size exceeds maximum of ${MAX_TOTAL_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`,
      );
    }
  }
}
