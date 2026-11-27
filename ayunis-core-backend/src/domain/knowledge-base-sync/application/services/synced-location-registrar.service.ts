import { Injectable, Logger } from '@nestjs/common';
import { SyncedLocationAlreadyExistsError } from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import { SyncRunsPort } from 'src/domain/knowledge-base-sync/application/ports/sync-runs.port';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import type { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';

/**
 * Stores a new location, unless its knowledge base already syncs it, and
 * queues its first sync, which lists it.
 */
@Injectable()
export class SyncedLocationRegistrar {
  private readonly logger = new Logger(SyncedLocationRegistrar.name);

  constructor(
    private readonly repository: SyncedLocationsRepository,
    private readonly runs: SyncRunsPort,
  ) {}

  async register<L extends SyncedLocation>(location: L): Promise<L> {
    if (!(await this.repository.create(location)))
      throw new SyncedLocationAlreadyExistsError(location.knowledgeBaseId);
    await this.runs
      .enqueue([{ orgId: location.orgId, locationId: location.id }])
      .catch((error: unknown) =>
        // The sweep syncs it within a minute all the same: it is due.
        this.logger.warn(
          { locationId: location.id, error },
          'Could not queue the first sync',
        ),
      );
    return location;
  }
}
