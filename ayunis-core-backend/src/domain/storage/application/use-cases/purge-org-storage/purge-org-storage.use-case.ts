import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PurgeOrgStorageCommand } from './purge-org-storage.command';
import { PurgeStoragePrefixesUseCase } from '../purge-storage-prefixes/purge-storage-prefixes.use-case';
import { PurgeStoragePrefixesCommand } from '../purge-storage-prefixes/purge-storage-prefixes.command';
import type { PurgeStoragePrefixesResult } from '../purge-storage-prefixes/purge-storage-prefixes.use-case';
import { orgStoragePrefixes } from '../../../domain/org-storage-layout';

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
  constructor(
    @InjectPinoLogger(PurgeOrgStorageUseCase.name)
    private readonly logger: PinoLogger,
    private readonly purgeStoragePrefixesUseCase: PurgeStoragePrefixesUseCase,
  ) {}

  async execute(
    command: PurgeOrgStorageCommand,
  ): Promise<PurgeOrgStorageResult> {
    this.logger.info({ orgId: command.orgId }, 'Purging org storage');
    return this.purgeStoragePrefixesUseCase.execute(
      new PurgeStoragePrefixesCommand(orgStoragePrefixes(command.orgId)),
    );
  }
}
