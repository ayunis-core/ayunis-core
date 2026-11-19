import { Injectable } from '@nestjs/common';
import { LockKnowledgeBaseCommand } from 'src/domain/knowledge-bases/application/use-cases/lock-knowledge-base/lock-knowledge-base.command';
import { LockKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/lock-knowledge-base/lock-knowledge-base.use-case';
import { LockSourcesCommand } from 'src/domain/sources/application/use-cases/lock-sources/lock-sources.command';
import { LockSourcesUseCase } from 'src/domain/sources/application/use-cases/lock-sources/lock-sources.use-case';
import { AssertOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-org-active/assert-org-active.use-case';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import type { SyncedFile } from 'src/domain/knowledge-base-sync/domain/synced-file.entity';
import type { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';

export interface LockedLocation {
  location: SyncedLocation;
  files: SyncedFile[];
}

/**
 * Locks a location and its files for a sync or a removal, in the order in
 * which deletions take the same locks, so that neither deadlocks with them.
 * Deleting the organization or knowledge base locks its row before the rows
 * that cascade from it: the documents, the location and its files. Deleting
 * a document locks it before its file (`ON DELETE SET NULL`).
 */
@Injectable()
export class SyncedLocationLocks {
  constructor(
    private readonly repository: SyncedLocationsRepository,
    private readonly orgAccess: AssertOrgActiveUseCase,
    private readonly lockKnowledgeBase: LockKnowledgeBaseUseCase,
    private readonly lockSources: LockSourcesUseCase,
  ) {}

  /** `null` once the location is removed. */
  async lock(location: SyncedLocation): Promise<LockedLocation | null> {
    await this.orgAccess.execute({
      orgId: location.orgId,
      lockForLifecycle: true,
    });
    await this.lockKnowledgeBase.execute(
      new LockKnowledgeBaseCommand(location.knowledgeBaseId),
    );
    const locked = await this.repository.lockById(location.id);
    if (!locked) return null;
    // Read before the files are locked: only a sync, which holds the
    // location's lock, links files to documents; meanwhile a deleted
    // document can only unlink its file.
    const sourceIds = await this.repository.findFileSourceIds(location.id);
    await this.lockSources.execute(new LockSourcesCommand(sourceIds));
    const files = await this.repository.lockFiles(location.id);
    return { location: locked, files };
  }
}
