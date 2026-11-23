import type { UUID } from 'crypto';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';
import { SyncedFileState } from 'src/domain/knowledge-base-sync/domain/synced-file-state.enum';
import type { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import { SyncedLocationRecord } from './synced-location.record';

const bigintToNumber = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity({ name: 'knowledge_base_synced_files' })
@Unique(['locationId', 'externalId'])
@Check(
  'CHK_knowledge_base_synced_files_skip_reason',
  `("state" = 'skipped') = ("skipReason" IS NOT NULL)`,
)
@Check(
  'CHK_knowledge_base_synced_files_source',
  `"state" = 'imported' OR "sourceId" IS NULL`,
)
export class SyncedFileRecord extends BaseRecord {
  @Column({ type: 'uuid' })
  locationId: UUID;

  @ManyToOne(() => SyncedLocationRecord, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'locationId' })
  location: SyncedLocationRecord;

  @Column({ type: 'text' })
  externalId: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  path: string;

  @Column({ type: 'text', nullable: true })
  fileName: string | null;

  @Column({ type: 'text', nullable: true })
  url: string | null;

  @Column({ type: 'text' })
  version: string;

  @Column({ type: 'bigint', transformer: bigintToNumber })
  size: number;

  @Column({ type: 'enum', enum: SyncedFileState })
  state: SyncedFileState;

  @Column({ type: 'enum', enum: SyncedFileSkipReason, nullable: true })
  skipReason: SyncedFileSkipReason | null;

  // A user may remove the document; the file then stays without one.
  @Index()
  @Column({ type: 'uuid', nullable: true })
  sourceId: UUID | null;

  @ManyToOne(() => SourceRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sourceId' })
  source: SourceRecord | null;

  // No foreign key: it outlives the document, so that a user's removal of
  // the document can be traced back to the file.
  @Index()
  @Column({ type: 'varchar', nullable: true })
  lastSourceId: UUID | null;

  @Column({ type: 'text', nullable: true })
  documentVersion: string | null;

  @Column({ type: 'varchar', nullable: true })
  processingErrorCode: SourceProcessingErrorCode | null;
}
