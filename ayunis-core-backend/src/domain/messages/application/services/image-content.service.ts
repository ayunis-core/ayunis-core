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
  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024;

  constructor(private readonly downloadObjectUseCase: DownloadObjectUseCase) {}

  /**
   * Loads a stored image after checking its declared type and size. Fitting
   * it to a provider belongs to the inference boundary, not here.
   */
  async loadImage(
    content: ImageMessageContent,
    context: ImageContext,
  ): Promise<StoredImage> {
    // Compute storage path from context
    const storagePath = content.getStoragePath(
      context.orgId,
      context.threadId,
      context.messageId,
    );

    // Use the content type stored in the entity (validated at upload time)
    const contentType = content.contentType;
    const validatedContentType = this.validateContentType(contentType);

    const buffer = await this.downloadImageBuffer(storagePath);
    this.validateImageSize(buffer);

    return { buffer, contentType: validatedContentType };
  }

  normalizeContentType(contentType: string): string {
    return contentType.split(';')[0].trim();
  }

  validateContentType(contentType: string): AllowedImageContentType {
    // Normalize: remove charset/parameters and lowercase
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
    const maxSizeMB = this.MAX_IMAGE_SIZE / (1024 * 1024);

    if (buffer.length > this.MAX_IMAGE_SIZE) {
      throw new InferenceFailedError(
        `Image size exceeds maximum allowed size of ${maxSizeMB} MB`,
      );
    }
  }
}
