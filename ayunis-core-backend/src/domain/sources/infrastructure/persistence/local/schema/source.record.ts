import {
  Check,
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
import { ReindexIntervalUnit } from 'src/domain/sources/domain/reindex-interval';
import { TextSourceDetailsRecord } from './text-source-details.record';
import { DataSourceDetailsRecord } from './data-source-details.record';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';

@Entity('sources')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
// Keeps the scheduler's due-source claim to the scheduled rows.
@Index(['nextReindexAt'], { where: '"nextReindexAt" IS NOT NULL' })
// A schedule is either complete or absent, so a due row always has an interval.
@Check(
  `("reindexIntervalValue" IS NULL) = ("reindexIntervalUnit" IS NULL) AND ("reindexIntervalValue" IS NULL) = ("nextReindexAt" IS NULL)`,
)
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

  @Column({ type: 'timestamp', nullable: true })
  lastIndexedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastRunFailedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  lastRunError: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastRunErrorCode: SourceProcessingErrorCode | null;

  @Column({ type: 'int', nullable: true })
  reindexIntervalValue: number | null;

  @Column({ type: 'enum', enum: ReindexIntervalUnit, nullable: true })
  reindexIntervalUnit: ReindexIntervalUnit | null;

  // With time zone, unlike the run-state columns: it is compared against the
  // database's now() and written from both SQL and the application, which a
  // zone-less column would skew by the process' time-zone offset.
  @Column({ type: 'timestamptz', nullable: true })
  nextReindexAt: Date | null;

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
