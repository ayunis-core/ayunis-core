import { Inject, Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { ObjectStoragePort } from 'src/domain/storage/application/ports/object-storage.port';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
import {
  MessagesRepository,
  MESSAGES_REPOSITORY,
} from 'src/domain/messages/application/ports/messages.repository';

/**
 * Image path format: <orgId>/<threadId>/<messageId>/<index>.<ext>
 * This use case scans storage for images and removes those whose
 * corresponding message no longer exists in the database.
 */
@Injectable()
export class CleanupOrphanedImagesUseCase {
  private readonly logger = new Logger(CleanupOrphanedImagesUseCase.name);

  constructor(
    private readonly objectStoragePort: ObjectStoragePort,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
  ) {}

  async execute(): Promise<CleanupResult> {
    this.logger.log('Starting orphaned images cleanup');

    const result: CleanupResult = {
      scannedCount: 0,
      deletedCount: 0,
      failedCount: 0,
      deletedPaths: [],
      errors: [],
    };

    try {
      // List all objects in storage
      const allObjects = await this.objectStoragePort.listObjects();
      result.scannedCount = allObjects.length;

      this.logger.log(
        { objectCount: allObjects.length },
        'Scanning objects for orphans',
      );

      const orphanedPaths = await this.findOrphanedPaths(allObjects);
      this.logger.log(
        { imageCount: orphanedPaths.length },
        'Found orphaned images to delete',
      );
      await this.deleteOrphanedPaths(orphanedPaths, result);

      this.logger.log(
        {
          scanned: result.scannedCount,
          deleted: result.deletedCount,
          failed: result.failedCount,
        },
        'Orphaned images cleanup completed',
      );

      return result;
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Orphaned images cleanup failed',
      );
      throw error;
    }
  }

  private async findOrphanedPaths(allObjects: string[]): Promise<string[]> {
    const objectsByMessageId = this.groupObjectsByMessageId(allObjects);
    this.logger.debug(
      { messageCount: objectsByMessageId.size },
      'Found unique message IDs to check',
    );
    const orphanedPaths: string[] = [];
    for (const [messageId, paths] of objectsByMessageId) {
      try {
        const message = await this.messagesRepository.findById(
          messageId as UUID,
        );
        if (!message) {
          orphanedPaths.push(...paths);
          this.logger.debug(
            { messageId, imageCount: paths.length },
            'Message not found, marking images as orphaned',
          );
        }
      } catch (error) {
        this.logger.warn(
          {
            messageId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to check message',
        );
      }
    }
    return orphanedPaths;
  }

  private async deleteOrphanedPaths(
    paths: string[],
    result: CleanupResult,
  ): Promise<void> {
    for (const path of paths) {
      try {
        await this.deleteObjectUseCase.execute(new DeleteObjectCommand(path));
        result.deletedCount++;
        result.deletedPaths.push(path);
        this.logger.debug({ path }, 'Deleted orphaned image');
      } catch (error) {
        if (error instanceof ObjectNotFoundError) {
          this.logger.debug({ path }, 'Orphaned image already deleted');
          continue;
        }
        result.failedCount++;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({ path, error: errorMessage });
        this.logger.warn(
          { path, error: errorMessage },
          'Failed to delete orphaned image',
        );
      }
    }
  }

  /**
   * Groups storage paths by messageId extracted from path.
   * Path format: <orgId>/<threadId>/<messageId>/<index>.<ext>
   */
  private groupObjectsByMessageId(
    objectPaths: string[],
  ): Map<string, string[]> {
    const map = new Map<string, string[]>();

    for (const path of objectPaths) {
      const messageId = this.extractMessageIdFromPath(path);
      if (messageId) {
        const existing = map.get(messageId) ?? [];
        existing.push(path);
        map.set(messageId, existing);
      }
    }

    return map;
  }

  /**
   * Extracts messageId from storage path with strict validation.
   * Path format: <orgId>/<threadId>/<messageId>/<index>.<ext>
   *
   * Only returns messageId if the path matches the expected image format.
   * This prevents accidentally processing/deleting non-image files.
   */
  private extractMessageIdFromPath(path: string): string | null {
    const parts = path.split('/');
    // Expected: [orgId, threadId, messageId, filename]
    if (parts.length !== 4) {
      this.logger.debug(
        { path },
        'Skipping path with unexpected segment count',
      );
      return null; // Not a valid image path format
    }

    const [orgId, threadId, messageId, filename] = parts;

    // Validate UUID format for orgId, threadId, messageId
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (
      !uuidRegex.test(orgId) ||
      !uuidRegex.test(threadId) ||
      !uuidRegex.test(messageId)
    ) {
      this.logger.debug({ path }, 'Skipping path with invalid UUID format');
      return null; // Not a valid image path - skip
    }

    // Validate filename matches image pattern: <index>.<ext>
    const imageFilePattern = /^\d+\.(jpg|jpeg|png|gif|webp)$/i;
    if (!imageFilePattern.test(filename)) {
      this.logger.debug({ path }, 'Skipping path with non-image filename');
      return null; // Not a valid image filename - skip
    }

    return messageId;
  }
}

export interface CleanupResult {
  scannedCount: number;
  deletedCount: number;
  failedCount: number;
  deletedPaths: string[];
  errors: { path: string; error: string }[];
}
