import type { UUID } from 'crypto';
import { MessageContentInvalidError } from 'src/domain/messages/application/messages.errors';
import { MAX_IMAGE_SIZE_BYTES } from 'src/domain/messages/application/utils/image-upload.policy';
import {
  sniffAllowedImageContentType,
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
    if (
      !this.text?.trim() &&
      this.pendingImages.length === 0 &&
      !this.skillInstructions?.trim()
    ) {
      throw new MessageContentInvalidError(
        'Message must contain text, at least one image, or skill instructions',
      );
    }

    this.pendingImages.forEach((image) => this.validateImage(image));

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

  private validateImage(image: ImageUploadData): void {
    if (image.buffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new MessageContentInvalidError(
        `Image exceeds maximum size of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)} MiB`,
      );
    }
    if (!isAllowedImageContentType(image.contentType)) {
      throw new MessageContentInvalidError(
        `Unsupported image content type: ${image.contentType}`,
      );
    }
    if (
      sniffAllowedImageContentType(image.buffer) !==
      image.contentType.toLowerCase()
    ) {
      throw new MessageContentInvalidError(
        `Image bytes do not match the declared content type ${image.contentType}`,
      );
    }
  }
}
