import { Inject, Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { ObjectStoragePort } from 'src/domain/storage/application/ports/object-storage.port';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';
import {
  MessagesRepository,
  MESSAGES_REPOSITORY,
} from '../../ports/messages.repository';

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

      this.logger.log(`Scanning ${allObjects.length} objects for orphans`);

      // Group objects by messageId to batch check existence
      const messageIdToObjects = this.groupObjectsByMessageId(allObjects);
      const uniqueMessageIds = Array.from(messageIdToObjects.keys());

      this.logger.debug(
        `Found ${uniqueMessageIds.length} unique message IDs to check`,
      );

      // Check each message existence and collect orphaned paths
      const orphanedPaths: string[] = [];

      for (const messageId of uniqueMessageIds) {
        try {
          const message = await this.messagesRepository.findById(
            messageId as UUID,
          );

          if (!message) {
            // Message doesn't exist, all its images are orphaned
            const paths = messageIdToObjects.get(messageId) || [];
            orphanedPaths.push(...paths);
            this.logger.debug(
              `Message ${messageId} not found, marking ${paths.length} images as orphaned`,
            );
          }
        } catch (error) {
          this.logger.warn(`Failed to check message ${messageId}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      this.logger.log(
        `Found ${orphanedPaths.length} orphaned images to delete`,
      );

      // Delete orphaned images
      for (const path of orphanedPaths) {
        try {
          await this.objectStoragePort.delete(new StorageUrl(path, ''));
          result.deletedCount++;
          result.deletedPaths.push(path);
          this.logger.debug(`Deleted orphaned image: ${path}`);
        } catch (error) {
          result.failedCount++;
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({ path, error: errorMessage });
          this.logger.warn(`Failed to delete orphaned image: ${path}`, {
            error: errorMessage,
          });
        }
      }

      this.logger.log('Orphaned images cleanup completed', {
        scanned: result.scannedCount,
        deleted: result.deletedCount,
        failed: result.failedCount,
      });

      return result;
    } catch (error) {
      this.logger.error('Orphaned images cleanup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
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
        const existing = map.get(messageId) || [];
        existing.push(path);
        map.set(messageId, existing);
      }
    }

    return map;
  }

  /**
   * Extracts messageId from storage path.
   * Path format: <orgId>/<threadId>/<messageId>/<index>.<ext>
   */
  private extractMessageIdFromPath(path: string): string | null {
    const parts = path.split('/');
    // Expected: [orgId, threadId, messageId, filename]
    if (parts.length >= 4) {
      return parts[2]; // messageId is the third part
    }
    return null;
  }
}

export interface CleanupResult {
  scannedCount: number;
  deletedCount: number;
  failedCount: number;
  deletedPaths: string[];
  errors: { path: string; error: string }[];
}
