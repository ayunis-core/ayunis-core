import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { MessagesRepository } from 'src/domain/messages/application/ports/messages.repository';
import { MESSAGES_REPOSITORY } from 'src/domain/messages/application/ports/messages.repository';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class DeleteThreadImagesUseCase {
  private readonly logger = new Logger(DeleteThreadImagesUseCase.name);

  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Extracts image storage paths from thread messages and deletes them from storage.
   * Continues even if some image deletions fail to ensure operation proceeds.
   */
  async execute(threadId: UUID): Promise<void> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }

    try {
      const imagePaths = await this.extractImagePaths(threadId, orgId);

      if (imagePaths.length === 0) {
        this.logger.debug('No images to delete for thread', { threadId });
        return;
      }

      this.logger.log('Deleting images associated with thread', {
        threadId,
        imageCount: imagePaths.length,
      });

      const deletePromises = imagePaths.map(async (imagePath) => {
        try {
          await this.deleteObjectUseCase.execute(
            new DeleteObjectCommand(imagePath),
          );
          this.logger.debug('Deleted image from storage', {
            threadId,
            imagePath,
          });
        } catch (error) {
          if (error instanceof ObjectNotFoundError) {
            this.logger.warn('Image not found in storage, skipping deletion', {
              threadId,
              imagePath,
              error: error.message,
            });
          } else {
            this.logger.warn('Failed to delete image from storage', {
              threadId,
              imagePath,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      });

      await Promise.all(deletePromises);

      this.logger.log('Completed image cleanup for thread', {
        threadId,
        imageCount: imagePaths.length,
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
   * Extracts all image storage paths from messages in a thread.
   * Returns unique storage paths that need to be deleted.
   */
  private async extractImagePaths(
    threadId: UUID,
    orgId: string,
  ): Promise<string[]> {
    const messages = await this.messagesRepository.findManyByThreadId(threadId);

    const imagePaths = new Set<string>();

    for (const message of messages) {
      for (const content of message.content) {
        if (content.type === MessageContentType.IMAGE) {
          const imageContent = content as ImageMessageContent;
          // Compute storage path from the image content metadata
          const storagePath = imageContent.getStoragePath(
            orgId,
            threadId,
            message.id,
          );
          imagePaths.add(storagePath);
        }
      }
    }

    const uniqueImagePaths = Array.from(imagePaths);
    this.logger.debug(
      `Extracted ${uniqueImagePaths.length} unique images from thread`,
      {
        threadId,
        imagePaths: uniqueImagePaths,
      },
    );

    return uniqueImagePaths;
  }
}
