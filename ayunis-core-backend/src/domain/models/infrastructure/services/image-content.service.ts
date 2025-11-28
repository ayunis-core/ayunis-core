import { Injectable, Inject, Logger } from '@nestjs/common';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { ObjectStoragePort } from 'src/domain/storage/application/ports/object-storage.port';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';
import { InferenceFailedError } from '../../application/models.errors';

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

type AllowedImageContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

export interface ValidatedImageData {
  base64: string;
  contentType: AllowedImageContentType;
}

export interface ImageContext {
  orgId: string;
  threadId: string;
  messageId: string;
}

@Injectable()
export class ImageContentService {
  private readonly logger = new Logger(ImageContentService.name);

  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB - matches upload limit

  constructor(
    @Inject(ObjectStoragePort)
    private readonly objectStorage: ObjectStoragePort,
  ) {}

  /**
   * Convert an image message content to base64 for inference APIs.
   *
   * @param content - The ImageMessageContent entity
   * @param context - Context needed to compute the storage path (orgId, threadId, messageId)
   */
  async convertImageToBase64(
    content: ImageMessageContent,
    context: ImageContext,
  ): Promise<ValidatedImageData> {
    // Compute storage path from context
    const storagePath = content.getStoragePath(
      context.orgId,
      context.threadId,
      context.messageId,
    );
    const storageUrl = new StorageUrl(storagePath, '');

    // Use the content type stored in the entity (validated at upload time)
    const contentType = content.contentType;
    const validatedContentType = this.validateContentType(contentType);

    const buffer = await this.downloadImageBuffer(storageUrl);
    this.validateImageSize(buffer);

    const base64Data = buffer.toString('base64');

    return {
      base64: base64Data,
      contentType: validatedContentType,
    };
  }

  normalizeContentType(contentType: string): string {
    return contentType.split(';')[0].trim();
  }

  validateContentType(contentType: string): AllowedImageContentType {
    if (
      !ALLOWED_CONTENT_TYPES.includes(contentType as AllowedImageContentType)
    ) {
      throw new InferenceFailedError(
        `Unsupported image content type: ${contentType}`,
      );
    }

    return contentType as AllowedImageContentType;
  }

  private async downloadImageBuffer(storageUrl: StorageUrl): Promise<Buffer> {
    const stream = await this.objectStorage.download(storageUrl);

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk as Buffer));
      stream.on('end', () => resolve());
      stream.on('error', (err) =>
        reject(err instanceof Error ? err : new Error(String(err))),
      );
    });

    return Buffer.concat(chunks);
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
