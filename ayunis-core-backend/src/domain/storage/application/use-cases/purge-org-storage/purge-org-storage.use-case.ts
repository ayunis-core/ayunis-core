import { Injectable, Logger } from '@nestjs/common';
import { PurgeOrgStorageCommand } from './purge-org-storage.command';
import { PurgeStoragePrefixesUseCase } from '../purge-storage-prefixes/purge-storage-prefixes.use-case';
import { PurgeStoragePrefixesCommand } from '../purge-storage-prefixes/purge-storage-prefixes.command';
import type { PurgeStoragePrefixesResult } from '../purge-storage-prefixes/purge-storage-prefixes.use-case';

export type PurgeOrgStorageResult = PurgeStoragePrefixesResult;

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
 */
@Injectable()
export class PurgeOrgStorageUseCase {
  private readonly logger = new Logger(PurgeOrgStorageUseCase.name);

  constructor(
    private readonly purgeStoragePrefixesUseCase: PurgeStoragePrefixesUseCase,
  ) {}

  async execute(
    command: PurgeOrgStorageCommand,
  ): Promise<PurgeOrgStorageResult> {
    this.logger.log('Purging org storage', { orgId: command.orgId });
    return this.purgeStoragePrefixesUseCase.execute(
      new PurgeStoragePrefixesCommand([
        `${command.orgId}/`,
        `generated-images/${command.orgId}/`,
        `letterheads/${command.orgId}/`,
      ]),
    );
  }
}
