import { Inject, Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import {
  MessagesRepository,
  MESSAGES_REPOSITORY,
} from 'src/domain/messages/application/ports/messages.repository';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
import { GeneratedImagesRepository } from '../ports/generated-images.repository';

/**
 * Removes all object-storage (MinIO) assets that belong to a thread: image
 * attachments referenced by its messages and any generated-image blobs.
 *
 * Shared by thread deletion and user deletion. Storage errors are logged and
 * swallowed so a transient failure never blocks the surrounding delete — the
 * database rows are removed regardless, and an orphaned-object sweep backstops
 * anything that slips through.
 */
@Injectable()
export class ThreadStorageCleanupService {
  private readonly logger = new Logger(ThreadStorageCleanupService.name);

  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly generatedImagesRepository: GeneratedImagesRepository,
  ) {}

  async cleanupThreadStorage(threadId: UUID, orgId: string): Promise<void> {
    await Promise.all([
      this.deleteThreadImages(threadId, orgId),
      this.deleteGeneratedImageBlobs(threadId),
    ]);
  }

  private async deleteThreadImages(
    threadId: UUID,
    orgId: string,
  ): Promise<void> {
    const imagePaths = await this.extractImagePaths(threadId, orgId);

    if (imagePaths.length === 0) {
      return;
    }

    this.logger.log('Deleting images associated with thread', {
      threadId,
      imageCount: imagePaths.length,
    });

    await Promise.all(
      imagePaths.map((imagePath) =>
        this.deleteObject(imagePath, { threadId, imagePath }),
      ),
    );
  }

  private async deleteGeneratedImageBlobs(threadId: UUID): Promise<void> {
    const images =
      await this.generatedImagesRepository.findManyByThreadId(threadId);

    if (images.length === 0) {
      return;
    }

    this.logger.log('Deleting generated images associated with thread', {
      threadId,
      imageCount: images.length,
    });

    await Promise.all(
      images.map((image) =>
        this.deleteObject(image.storageKey, {
          threadId,
          storageKey: image.storageKey,
        }),
      ),
    );
  }

  private async deleteObject(
    objectName: string,
    logContext: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.deleteObjectUseCase.execute(
        new DeleteObjectCommand(objectName),
      );
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        this.logger.warn('Object not found in storage, skipping deletion', {
          ...logContext,
          error: error.message,
        });
      } else {
        this.logger.warn('Failed to delete object from storage', {
          ...logContext,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

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
          imagePaths.add(
            imageContent.getStoragePath(orgId, threadId, message.id),
          );
        }
      }
    }

    return Array.from(imagePaths);
  }
}
