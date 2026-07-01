import {
  ChildEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  TableInheritance,
} from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import {
  DataType,
  FileType,
  SourceType,
  TextType,
} from '../../../../domain/source-type.enum';
import { SourceCreator } from '../../../../domain/source-creator.enum';
import { SourceStatus } from '../../../../domain/source-status.enum';
import { TextSourceDetailsRecord } from './text-source-details.record';
import { DataSourceDetailsRecord } from './data-source-details.record';
import { KnowledgeBaseRecord } from '../../../../../knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';

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

  @Column({ type: 'timestamp', nullable: true })
  processingStartedAt: Date | null;

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
