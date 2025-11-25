import { Inject, Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { MessagesRepository } from 'src/domain/messages/application/ports/messages.repository';
import { MESSAGES_REPOSITORY } from 'src/domain/messages/application/ports/messages.repository';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';

@Injectable()
export class DeleteThreadImagesUseCase {
  private readonly logger = new Logger(DeleteThreadImagesUseCase.name);

  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
  ) {}

  /**
   * Extracts image URLs from thread messages and deletes them from storage.
   * Continues even if some image deletions fail to ensure operation proceeds.
   */
  async execute(threadId: UUID): Promise<void> {
    try {
      const imageUrls = await this.extractImageUrls(threadId);

      if (imageUrls.length === 0) {
        this.logger.debug('No images to delete for thread', { threadId });
        return;
      }

      this.logger.log('Deleting images associated with thread', {
        threadId,
        imageCount: imageUrls.length,
      });

      const deletePromises = imageUrls.map(async (imageUrl) => {
        try {
          await this.deleteObjectUseCase.execute(
            new DeleteObjectCommand(imageUrl),
          );
          this.logger.debug('Deleted image from storage', {
            threadId,
            imageUrl,
          });
        } catch (error) {
          if (error instanceof ObjectNotFoundError) {
            this.logger.warn('Image not found in storage, skipping deletion', {
              threadId,
              imageUrl,
              error: error.message,
            });
          } else {
            this.logger.warn('Failed to delete image from storage', {
              threadId,
              imageUrl,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      });

      await Promise.all(deletePromises);

      this.logger.log('Completed image cleanup for thread', {
        threadId,
        imageCount: imageUrls.length,
      });
    } catch (error) {
      this.logger.error('Failed to delete thread images', {
        threadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Extracts all image URLs from messages in a thread.
   * Returns unique image URLs (object names) that need to be deleted.
   */
  private async extractImageUrls(threadId: UUID): Promise<string[]> {
    const messages = await this.messagesRepository.findManyByThreadId(threadId);

    const imageUrls = new Set<string>();

    for (const message of messages) {
      for (const content of message.content) {
        if (content.type === MessageContentType.IMAGE) {
          const imageContent = content as ImageMessageContent;
          const objectName = this.extractObjectName(imageContent.imageUrl);
          if (objectName) {
            imageUrls.add(objectName);
          }
        }
      }
    }

    const uniqueImageUrls = Array.from(imageUrls);
    this.logger.debug(
      `Extracted ${uniqueImageUrls.length} unique images from thread`,
      {
        threadId,
        imageUrls: uniqueImageUrls,
      },
    );

    return uniqueImageUrls;
  }

  /**
   * Extracts object name from imageUrl.
   * Handles both formats:
   * - "objectName" (direct object name)
   * - "/storage/objectName" (with prefix)
   */
  private extractObjectName(imageUrl: string): string | null {
    if (!imageUrl || typeof imageUrl !== 'string') {
      return null;
    }

    const objectName = imageUrl.replace(/^\/storage\//, '').trim();

    return objectName || null;
  }
}
