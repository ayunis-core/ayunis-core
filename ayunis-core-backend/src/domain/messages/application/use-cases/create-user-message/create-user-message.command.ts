import { UUID } from 'crypto';
import { PendingImageUpload } from 'src/domain/messages/domain/value-objects/pending-image-upload.value-object';

const MAX_TOTAL_IMAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB total

export class CreateUserMessageCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly text?: string,
    public readonly pendingImages: PendingImageUpload[] = [],
  ) {
    this.validate();
  }

  private validate(): void {
    // Validate that at least text or images are provided
    if (!this.text?.trim() && this.pendingImages.length === 0) {
      throw new Error('Message must contain text or at least one image');
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
