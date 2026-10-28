import { Injectable, Logger } from '@nestjs/common';
import { PurgeOrgStorageCommand } from './purge-org-storage.command';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { PurgeStoragePrefixesCommand } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.command';
import type { PurgeStoragePrefixesResult } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { orgStoragePrefixes } from 'src/domain/storage/domain/org-storage-layout';

export type PurgeOrgStorageResult = PurgeStoragePrefixesResult;

/**
 * Removes every object-storage (MinIO) blob owned by an organization.
 *
 * The database cascade purges relational rows and pgvector embeddings on org
 * deletion, but uploaded files and generated images live in object storage and
 * are only reachable by their key. Every org-scoped key embeds the org id as a
 * path segment, so purging the org's prefixes removes all of its blobs —
 * including any that were already orphaned from their database rows. The prefix
 * layout is owned by `org-storage-layout` so the purge and the orphan sweep
 * always agree on it.
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
    this.logger.log({ orgId: command.orgId }, 'Purging org storage');
    return this.purgeStoragePrefixesUseCase.execute(
      new PurgeStoragePrefixesCommand(orgStoragePrefixes(command.orgId)),
    );
  }
}
