import { Injectable } from '@nestjs/common';
import { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';
import type { SyncedLocationRecord } from 'src/domain/knowledge-base-sync/infrastructure/persistence/local/schema/synced-location.record';

type SyncedLocationRow = Omit<
  SyncedLocationRecord,
  'org' | 'knowledgeBase' | 'connector'
>;

@Injectable()
export class SyncedLocationMapper {
  toDomain(record: SyncedLocationRow): SyncedLocation {
    return new SyncedLocation({
      id: record.id,
      orgId: record.orgId,
      knowledgeBaseId: record.knowledgeBaseId,
      connectorId: record.connectorId,
      location: record.location,
      cursor: record.cursor,
      state: record.state,
      lastSyncedAt: record.lastSyncedAt,
      nextSyncAt: record.nextSyncAt,
      syncingSince: record.syncingSince,
      pausedUntil: record.pausedUntil,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toInsertRow(
    location: SyncedLocation,
  ): Omit<SyncedLocationRow, 'createdAt' | 'updatedAt'> {
    return {
      id: location.id,
      orgId: location.orgId,
      knowledgeBaseId: location.knowledgeBaseId,
      connectorId: location.connectorId,
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
