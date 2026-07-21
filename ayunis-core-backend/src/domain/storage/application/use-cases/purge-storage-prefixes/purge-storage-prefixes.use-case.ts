import { Injectable, Logger } from '@nestjs/common';
import { ListObjectsUseCase } from '../list-objects/list-objects.use-case';
import { ListObjectsCommand } from '../list-objects/list-objects.command';
import { DeleteObjectUseCase } from '../delete-object/delete-object.use-case';
import { DeleteObjectCommand } from '../delete-object/delete-object.command';
import { ObjectNotFoundError } from '../../storage.errors';
import { PurgeStoragePrefixesCommand } from './purge-storage-prefixes.command';

export interface PurgeStoragePrefixesResult {
  deletedCount: number;
  failedCount: number;
}

/**
 * Removes every object-storage (MinIO) blob under the given key prefixes.
 *
 * Prefix sweeps need no database rows, so callers can run them after the
 * owning rows are already cascade-deleted — including blobs that were already
 * orphaned from their rows.
 *
 * The sweep is best-effort throughout: a prefix that fails to list is logged
 * and skipped without aborting the other prefixes, a missing object is treated
 * as already cleaned, and any other delete failure is logged and counted
 * without aborting the remaining deletions.
 */
@Injectable()
export class PurgeStoragePrefixesUseCase {
  private readonly logger = new Logger(PurgeStoragePrefixesUseCase.name);

  constructor(
    private readonly listObjectsUseCase: ListObjectsUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
  ) {}

  async execute(
    command: PurgeStoragePrefixesCommand,
  ): Promise<PurgeStoragePrefixesResult> {
    this.logger.log('Purging storage prefixes', {
      prefixCount: command.prefixes.length,
    });

    const objectNames = await this.collectObjects(command.prefixes);
    if (objectNames.length === 0) {
      return { deletedCount: 0, failedCount: 0 };
    }

    const result = await this.deleteObjects(objectNames);
    this.logger.log('Finished purging storage prefixes', { ...result });
    return result;
  }

  private async collectObjects(prefixes: string[]): Promise<string[]> {
    const objectNames = new Set<string>();
    for (const prefix of prefixes) {
      // A prefix that fails to list leaks its blobs, but must not abort the
      // sweep of the remaining prefixes or the deletion of what was listed.
      try {
        const names = await this.listObjectsUseCase.execute(
          new ListObjectsCommand(prefix),
        );
        for (const name of names) {
          objectNames.add(name);
        }
      } catch (error) {
        this.logger.error('Failed to list storage prefix', {
          prefix,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    return Array.from(objectNames);
  }

  private async deleteObjects(
    objectNames: string[],
  ): Promise<PurgeStoragePrefixesResult> {
    let deletedCount = 0;
    let failedCount = 0;
    for (const objectName of objectNames) {
      if (await this.deleteObject(objectName)) {
        deletedCount++;
      } else {
        failedCount++;
      }
    }
    return { deletedCount, failedCount };
  }

  private async deleteObject(objectName: string): Promise<boolean> {
    try {
      await this.deleteObjectUseCase.execute(
        new DeleteObjectCommand(objectName),
      );
      return true;
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return true;
      }
      this.logger.warn('Failed to delete object from storage', {
        objectName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}
