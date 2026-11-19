import {
  ChildEntity,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  TableInheritance,
} from 'typeorm';
import type { UUID } from 'crypto';
import type { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { BaseRecord } from 'src/common/db/base-record';
import {
  DataType,
  FileType,
  SourceType,
  TextType,
} from 'src/domain/sources/domain/source-type.enum';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextSourceDetailsRecord } from './text-source-details.record';
import { DataSourceDetailsRecord } from './data-source-details.record';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { RecordingRecord } from 'src/domain/recordings/infrastructure/persistence/local/schema/recording.record';
import { ModelRecord } from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';
import { SyncedLocationRecord } from 'src/domain/knowledge-base-sync/infrastructure/persistence/local/schema/synced-location.record';

@Entity('sources')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class SourceRecord extends BaseRecord {
  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: SourceCreator,
    default: SourceCreator.USER,
  })
  createdBy: SourceCreator;

  @Column({
    type: 'enum',
    enum: SourceStatus,
    default: SourceStatus.READY,
  })
  status: SourceStatus;

  @Column({ type: 'text', nullable: true })
  processingError: string | null;

  @Column({ type: 'varchar', nullable: true })
  processingErrorCode: SourceProcessingErrorCode | null;

  @Column({ type: 'timestamp', nullable: true })
  processingStartedAt: Date | null;

  // Looked up by key on every source deletion (findReferencedStorageKeys).
  @Index('IDX_sources_storageKey')
  @Column({ type: 'varchar', nullable: true })
  storageKey: string | null;

  @Index()
  @Column({ nullable: true })
  knowledgeBaseId: UUID | null;

  // onDelete: 'CASCADE' — deleting a knowledge base removes its sources (and,
  // via their own cascades, RAG parent/child chunks and embeddings). Keeps org
  // deletion from leaving orphaned knowledge-base data behind. Sources not tied
  // to a knowledge base (knowledgeBaseId null, e.g. thread uploads) are
  // unaffected.
  @ManyToOne(() => KnowledgeBaseRecord, (kb) => kb.sources, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'knowledgeBaseId' })
  knowledgeBase: KnowledgeBaseRecord | null;

  // The audio of a meeting recording; a recording has at most one. Deleting
  // the recording deletes it with its transcript and index entries.
  @Index({ unique: true, where: '"recordingId" IS NOT NULL' })
  @Column({ nullable: true })
  recordingId: UUID | null;

  @ManyToOne(() => RecordingRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recordingId' })
  recording: RecordingRecord | null;

  // Set on a hidden replacement: the next version of this source, processed
  // outside every knowledge base until it is swapped in. Deleting the source
  // it replaces deletes it too.
  @Index()
  @Column({ nullable: true })
  replacesSourceId: UUID | null;

  @ManyToOne(() => SourceRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'replacesSourceId' })
  replaces: SourceRecord | null;

  // The synced location a document is kept in sync with; a replacement takes
  // it over when it is swapped in.
  @Index()
  @Column({ nullable: true })
  syncedLocationId: UUID | null;

  @ManyToOne(() => SyncedLocationRecord, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'syncedLocationId' })
  syncedLocation: SyncedLocationRecord | null;
}

@ChildEntity(SourceType.TEXT)
export class TextSourceRecord extends SourceRecord {
  @Column({ type: 'enum', enum: TextType })
  textType: TextType;

  @Column({ type: 'enum', enum: FileType, nullable: true })
  fileType: FileType | null;

  @Column({ type: 'varchar', nullable: true })
  url: string | null;

  /** Link depth a URL source was crawled at; null for non-URL sources. */
  @Column({ type: 'int', nullable: true })
  maxDepth: number | null;

  @OneToOne(() => TextSourceDetailsRecord, (details) => details.source, {
    cascade: true,
  })
  textSourceDetails: TextSourceDetailsRecord;

  // The catalog embedding model the source's index entries were produced
  // with; null when unknown (indexed before this was recorded, or never
  // indexed). Written only by the indexing paths, never by save().
  @Column({ type: 'varchar', nullable: true })
  embeddingModelId: UUID | null;

  @ManyToOne(() => ModelRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'embeddingModelId' })
  embeddingModel: ModelRecord | null;
}

@ChildEntity(SourceType.DATA)
export class DataSourceRecord extends SourceRecord {
  @Column({ type: 'enum', enum: DataType })
  dataType: DataType;

  @OneToOne(() => DataSourceDetailsRecord, (details) => details.source, {
    cascade: true,
  })
  dataSourceDetails: DataSourceDetailsRecord;
}
