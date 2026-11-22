import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ConnectorSyncedLocation } from 'src/domain/knowledge-base-sync/domain/connector-synced-location.entity';
import type {
  SyncedLocation,
  SyncedLocationParams,
} from 'src/domain/knowledge-base-sync/domain/synced-location.entity';
import {
  ConnectorSyncedLocationRecord,
  type SyncedLocationRecord,
} from 'src/domain/knowledge-base-sync/infrastructure/persistence/local/schema/synced-location.record';

@Injectable()
export class SyncedLocationMapper {
  toDomain(record: SyncedLocationRecord): SyncedLocation {
    if (record instanceof ConnectorSyncedLocationRecord)
      return new ConnectorSyncedLocation({
        ...this.toParams(record),
        connectorId: record.connectorId as UUID,
      });
    throw new Error(`Unknown synced location record subtype for ${record.id}`);
  }

  /** A record to insert; `createdAt` and `updatedAt` are the database's. */
  toInsertRecord(location: SyncedLocation): SyncedLocationRecord {
    if (location instanceof ConnectorSyncedLocation)
      return Object.assign(new ConnectorSyncedLocationRecord(), {
        ...this.toRow(location),
        connectorId: location.connectorId,
      });
    throw new Error(`Unknown synced location subtype for ${location.id}`);
  }

  private toParams(record: SyncedLocationRecord): SyncedLocationParams {
    return {
      id: record.id,
      orgId: record.orgId,
      knowledgeBaseId: record.knowledgeBaseId,
      location: record.location,
      cursor: record.cursor,
      state: record.state,
      lastSyncedAt: record.lastSyncedAt,
      nextSyncAt: record.nextSyncAt,
      syncingSince: record.syncingSince,
      pausedUntil: record.pausedUntil,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private toRow(location: SyncedLocation) {
    return {
      id: location.id,
      orgId: location.orgId,
      knowledgeBaseId: location.knowledgeBaseId,
      location: location.location,
      cursor: location.cursor,
      state: location.state,
      lastSyncedAt: location.lastSyncedAt,
      nextSyncAt: location.nextSyncAt,
      syncingSince: location.syncingSince,
      pausedUntil: location.pausedUntil,
    };
  }
}
