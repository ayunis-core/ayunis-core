import { Injectable } from '@nestjs/common';
import type {
  SyncChangesResult,
  SyncItemContentResult,
} from 'src/domain/knowledge-base-sync/application/models/sync-source-results';
import { ConnectorSyncedLocation } from 'src/domain/knowledge-base-sync/domain/connector-synced-location.entity';
import type { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';
import { ConnectorSyncSource } from './connector-sync-source.service';

/** Lists and reads a location through the sync source of its subclass. */
@Injectable()
export class SyncSources {
  constructor(private readonly connectorSource: ConnectorSyncSource) {}

  listChanges(location: SyncedLocation): Promise<SyncChangesResult> {
    if (location instanceof ConnectorSyncedLocation)
      return this.connectorSource.listChanges(location);
    throw noSourceFor(location);
  }

  fetchItemContent(
    location: SyncedLocation,
    itemId: string,
  ): Promise<SyncItemContentResult> {
    if (location instanceof ConnectorSyncedLocation)
      return this.connectorSource.fetchItemContent(location, itemId);
    throw noSourceFor(location);
  }
}

function noSourceFor(location: SyncedLocation): Error {
  return new Error(`No sync source for ${location.provider} locations`);
}
