import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { AddSyncedDocumentsToKnowledgeBaseCommand } from 'src/domain/knowledge-bases/application/use-cases/add-synced-documents-to-knowledge-base/add-synced-documents-to-knowledge-base.command';
import { AddSyncedDocumentsToKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/add-synced-documents-to-knowledge-base/add-synced-documents-to-knowledge-base.use-case';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import { SyncedLocationNotFoundError } from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import type { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';
import type { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { RenameSourcesCommand } from 'src/domain/sources/application/use-cases/rename-sources/rename-sources.command';
import { RenameSourcesUseCase } from 'src/domain/sources/application/use-cases/rename-sources/rename-sources.use-case';
import { SyncedLocationLocks } from './synced-location-locks.service';
import {
  SyncReconciler,
  type ListedChanges,
  type SyncPlan,
} from './sync-reconciler.service';

export interface AppliedSync {
  plan: SyncPlan;
  /** Documents created in this sync. */
  createdSourceIds: UUID[];
}

/**
 * Applies a listing in one transaction: files, documents and cursor change
 * together, so an interrupted sync repeats from the old cursor. The
 * location and its files stay locked throughout, which serializes syncs and
 * removal of the same location and keeps documents from being created for a
 * location that is being removed. The listing is made before the lock, so a
 * sync recorded in between makes it outdated: it is then not applied.
 */
@Injectable()
export class SyncPlanApplier {
  constructor(
    private readonly repository: SyncedLocationsRepository,
    private readonly locks: SyncedLocationLocks,
    private readonly reconciler: SyncReconciler,
    private readonly addDocuments: AddSyncedDocumentsToKnowledgeBaseUseCase,
    private readonly renameSources: RenameSourcesUseCase,
    private readonly deleteSources: DeleteSourcesUseCase,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  /** `null` when another sync was recorded since `location` was read. */
  apply(
    location: SyncedLocation,
    changes: ListedChanges & { cursor: string },
    rejections: Map<string, SyncedFileSkipReason>,
  ): Promise<AppliedSync | null> {
    return this.txHost.withTransaction(async () => {
      const locked = await this.locks.lock(location);
      if (!locked) throw new SyncedLocationNotFoundError(location.id);
      const { lastSyncedAt } = locked.location;
      if (lastSyncedAt?.getTime() !== location.lastSyncedAt?.getTime())
        return null;
      const plan = this.reconciler.plan(
        location.id,
        locked.files,
        changes,
        rejections,
      );
      await this.repository.deleteFiles(plan.removed.map(({ id }) => id));
      await this.deleteSources.execute(
        new DeleteSourcesCommand(plan.documentsToRemove, location.orgId),
      );
      await this.renameSources.execute(new RenameSourcesCommand(plan.renames));
      const created = await this.addDocuments.execute(
        new AddSyncedDocumentsToKnowledgeBaseCommand(
          location.knowledgeBaseId,
          plan.awaitingDocument.map((file) => ({
            name: file.name,
            fileName: file.fileName,
            url: file.url,
          })),
          location.id,
        ),
      );
      const createdSourceIds = created.map(({ id }) => id);
      this.reconciler.assignDocuments(plan, createdSourceIds);
      await this.repository.saveFiles([...plan.changed]);
      await this.repository.recordSync(location.id, changes.cursor, new Date());
      return { plan, createdSourceIds };
    });
  }
}
