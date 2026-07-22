import { Injectable, Logger } from '@nestjs/common';
import { ListObjectsUseCase } from '../list-objects/list-objects.use-case';
import { ListObjectsCommand } from '../list-objects/list-objects.command';
import { DeleteObjectUseCase } from '../delete-object/delete-object.use-case';
import { DeleteObjectCommand } from '../delete-object/delete-object.command';
import { ObjectNotFoundError } from '../../storage.errors';
import { PurgeOrgStorageCommand } from './purge-org-storage.command';

export interface PurgeOrgStorageResult {
  deletedCount: number;
  failedCount: number;
}

/**
 * Removes every object-storage (MinIO) blob owned by an organization.
 *
 * The database cascade purges relational rows and pgvector embeddings on org
 * deletion, but uploaded files and generated images live in object storage and
 * are only reachable by their key. Every org-scoped key embeds the org id as a
 * path segment, so purging the known prefixes below removes all of the org's
 * blobs — including any that were already orphaned from their database rows.
 *
 * Keep this list in sync when a new org-scoped storage layout is introduced:
 *   - `<orgId>/...`                 message image attachments + document
 *                                    processing temp files
 *   - `generated-images/<orgId>/...` model-generated images
 *   - `letterheads/<orgId>/...`      rendered letterhead PDFs
 *
 * Deletion is best-effort per object: a missing object is treated as already
 * cleaned, and any other failure is logged and counted without aborting the
 * remaining deletions.
 */
@Injectable()
export class PurgeOrgStorageUseCase {
  private readonly logger = new Logger(PurgeOrgStorageUseCase.name);

  constructor(
    private readonly listObjectsUseCase: ListObjectsUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
  ) {}

  async execute(
    command: PurgeOrgStorageCommand,
  ): Promise<PurgeOrgStorageResult> {
    const prefixes = this.buildOrgPrefixes(command.orgId);
    this.logger.log('Purging org storage', { orgId: command.orgId });

    const objectNames = await this.collectObjects(prefixes);
    if (objectNames.length === 0) {
      return { deletedCount: 0, failedCount: 0 };
    }

    const result = await this.deleteObjects(objectNames);
    this.logger.log('Finished purging org storage', {
      orgId: command.orgId,
      ...result,
    });
    return result;
  }

  private buildOrgPrefixes(orgId: string): string[] {
    return [`${orgId}/`, `generated-images/${orgId}/`, `letterheads/${orgId}/`];
  }

  private async collectObjects(prefixes: string[]): Promise<string[]> {
    const objectNames = new Set<string>();
    for (const prefix of prefixes) {
      const names = await this.listObjectsUseCase.execute(
        new ListObjectsCommand(prefix),
      );
      for (const name of names) {
        objectNames.add(name);
      }
    }
    return Array.from(objectNames);
  }

  private async deleteObjects(
    objectNames: string[],
  ): Promise<PurgeOrgStorageResult> {
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
      this.logger.warn('Failed to delete org object from storage', {
        objectName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}
