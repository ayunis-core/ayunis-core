import { Injectable } from '@nestjs/common';
import { SyncedFile } from 'src/domain/knowledge-base-sync/domain/synced-file.entity';
import type { SyncedFileRecord } from 'src/domain/knowledge-base-sync/infrastructure/persistence/local/schema/synced-file.record';

type SyncedFileRow = Omit<SyncedFileRecord, 'location' | 'source'>;

@Injectable()
export class SyncedFileMapper {
  toDomain(record: SyncedFileRow): SyncedFile {
    return new SyncedFile({
      id: record.id,
      locationId: record.locationId,
      externalId: record.externalId,
      name: record.name,
      path: record.path,
      version: record.version,
      size: record.size,
      state: record.state,
      skipReason: record.skipReason,
      sourceId: record.sourceId,
      documentVersion: record.documentVersion,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRow(file: SyncedFile): Omit<SyncedFileRow, 'createdAt' | 'updatedAt'> {
    return {
      id: file.id,
      locationId: file.locationId,
      externalId: file.externalId,
      name: file.name,
      path: file.path,
      version: file.version,
      size: file.size,
      state: file.state,
      skipReason: file.skipReason,
      sourceId: file.sourceId,
      documentVersion: file.documentVersion,
    };
  }
}
