import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrgDeletionRequestedEvent } from 'src/iam/orgs/application/events/org-deletion-requested.event';
import { PurgeOrgStorageUseCase } from '../use-cases/purge-org-storage/purge-org-storage.use-case';
import { PurgeOrgStorageCommand } from '../use-cases/purge-org-storage/purge-org-storage.command';

/**
 * Registers the purge of an organization's object-storage (MinIO) blobs when
 * the org is being deleted. Relational rows and pgvector embeddings are
 * removed by the org `ON DELETE CASCADE` chain; this listener handles the
 * blobs the database cannot reach.
 *
 * The purge is only deferred here — the emitting use case runs it after the
 * row delete succeeds, so a failed delete never leaves a surviving org whose
 * blobs are already gone.
 */
@Injectable()
export class StorageOrgDeletionRequestedListener {
  constructor(
    private readonly purgeOrgStorageUseCase: PurgeOrgStorageUseCase,
  ) {}

  @OnEvent(OrgDeletionRequestedEvent.EVENT_NAME)
  handleOrgDeletionRequested(event: OrgDeletionRequestedEvent): void {
    event.deferCleanup('purge org storage', async () => {
      await this.purgeOrgStorageUseCase.execute(
        new PurgeOrgStorageCommand(event.orgId),
      );
    });
  }
}
