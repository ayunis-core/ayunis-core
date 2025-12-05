import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { ThreadsRepository } from '../../ports/threads.repository';
import { DeleteThreadCommand } from './delete-thread.command';
import { ThreadNotFoundError } from '../../threads.errors';
import { ContextService } from 'src/common/context/services/context.service';
import {
  MessagesRepository,
  MESSAGES_REPOSITORY,
} from 'src/domain/messages/application/ports/messages.repository';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';

@Injectable()
export class DeleteThreadUseCase {
  private readonly logger = new Logger(DeleteThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
  ) {}

  async execute(command: DeleteThreadCommand): Promise<void> {
    this.logger.log('delete', { threadId: command.id });

    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }

    try {
      // First verify the thread exists and belongs to the user
      const thread = await this.threadsRepository.findOne(command.id, userId);

      if (!thread) {
        throw new ThreadNotFoundError(command.id, userId);
      }

      // Delete associated images before deleting the thread
      await this.deleteThreadImages(command.id, orgId);

      // Delete the thread
      await this.threadsRepository.delete(command.id, userId);

      this.logger.log('Thread deleted successfully', {
        threadId: command.id,
        userId,
      });
    } catch (error) {
      if (error instanceof ThreadNotFoundError) {
        throw error;
      }
      this.logger.error('Failed to delete thread', {
        threadId: command.id,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Extracts image storage paths from thread messages and deletes them from storage.
   * Continues even if some image deletions fail to ensure operation proceeds.
   */
  private async deleteThreadImages(
    threadId: UUID,
    orgId: string,
  ): Promise<void> {
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
  }

  /**
   * Extracts all image storage paths from messages in a thread.
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
          const storagePath = imageContent.getStoragePath(
            orgId,
            threadId,
            message.id,
          );
          imagePaths.add(storagePath);
        }
      }
    }

    return Array.from(imagePaths);
  }
}
