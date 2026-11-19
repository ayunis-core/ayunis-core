import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import { FailedSourcesDeletedEvent } from 'src/domain/sources/application/events/failed-sources-deleted.event';

/**
 * A failed synced document a user removed is not imported again until its
 * file changes: the file is skipped, in the removal's transaction, so no
 * sync in between sees it without its document.
 */
@Injectable()
export class FailedSourcesDeletedListener {
  constructor(private readonly repository: SyncedLocationsRepository) {}

  @OnEvent(FailedSourcesDeletedEvent.EVENT_NAME, { suppressErrors: false })
  async handle(event: FailedSourcesDeletedEvent): Promise<void> {
    await this.repository.skipRemovedAfterFailure(event.sourceIds);
  }
}
