import { Injectable } from '@nestjs/common';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import {
  AllowedImageContentType,
  isAllowedImageContentType,
} from 'src/common/util/content-type.util';
import { streamToBuffer } from 'src/common/util/stream-to-buffer.util';

export interface StoredImage {
  buffer: Buffer;
  contentType: AllowedImageContentType;
}

export interface ImageContext {
  orgId: string;
  threadId: string;
  messageId: string;
}

@Injectable()
export class ImageContentService {
  // The upload limit before AYC-1256; images stored under it still load.
  private readonly LEGACY_MAX_STORED_IMAGE_BYTES = 10 * 1024 * 1024;

  constructor(private readonly downloadObjectUseCase: DownloadObjectUseCase) {}

  /**
   * Stored images retain the legacy size limit so previously accepted uploads
   * remain readable; new uploads use the stricter image-upload policy.
   */
  async loadImage(
    content: ImageMessageContent,
    context: ImageContext,
  ): Promise<StoredImage> {
    const contentType = this.validateContentType(content.contentType);
    const storagePath = content.getStoragePath(
      context.orgId,
      context.threadId,
      context.messageId,
    );

    const buffer = await this.downloadImageBuffer(storagePath);
    this.validateImageSize(buffer);

    return { buffer, contentType };
  }

  normalizeContentType(contentType: string): string {
    return contentType.split(';')[0].trim();
  }

  validateContentType(contentType: string): AllowedImageContentType {
    const normalized = this.normalizeContentType(contentType).toLowerCase();

    if (!isAllowedImageContentType(normalized)) {
      throw new InferenceFailedError(
        `Unsupported image content type: ${contentType}`,
      );
    }

    return normalized;
  }

  private async downloadImageBuffer(storagePath: string): Promise<Buffer> {
    const stream = await this.downloadObjectUseCase.execute(
      new DownloadObjectCommand(storagePath),
    );
    return streamToBuffer(stream);
  }

  private validateImageSize(buffer: Buffer): void {
    const maxSizeMB = this.LEGACY_MAX_STORED_IMAGE_BYTES / (1024 * 1024);

    if (buffer.length > this.LEGACY_MAX_STORED_IMAGE_BYTES) {
      throw new InferenceFailedError(
        `Image size exceeds maximum allowed size of ${maxSizeMB} MB`,
      );
    }
  }
}
