import type { UUID } from 'crypto';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Relation,
} from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { ModelRecord } from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';
import { OparlChunkSource } from 'src/domain/oparl/domain/oparl-chunk-source.enum';
import { OparlAgendaItemRecord } from './oparl-agenda-item.record';
import { OparlBodyRecord } from './oparl-body.record';
import { OparlFileRecord } from './oparl-file.record';
import { OparlMeetingRecord } from './oparl-meeting.record';
import { OparlPaperRecord } from './oparl-paper.record';

/**
 * A searchable passage of the mirror: of a file's text, or of the text
 * fields of a paper, meeting or agenda item. It references what it belongs
 * to and goes with any of it. Full text through `searchVector` (german);
 * vectors in the column of the model's dimensions, each with a partial
 * HNSW index. TypeORM cannot express the GIN and HNSW indexes, so the
 * migration CreateOparlDocumentTables creates them, by these names; it also
 * records the generated column's expression under `current_database()`
 * rather than the database it was generated on, so drift checks find it
 * under any database name.
 */
@Entity({ name: 'oparl_chunks' })
@Index(['bodyId', 'id'])
@Index('IDX_oparl_chunks_search_vector', { synchronize: false })
@Index('IDX_oparl_chunks_embedding1024_hnsw', { synchronize: false })
@Index('IDX_oparl_chunks_embedding1536_hnsw', { synchronize: false })
@Index('IDX_oparl_chunks_embedding2560_hnsw', { synchronize: false })
export class OparlChunkRecord extends BaseRecord {
  @Column({ type: 'uuid' })
  bodyId: UUID;

  @ManyToOne(() => OparlBodyRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bodyId' })
  body: Relation<OparlBodyRecord>;

  @Column({ type: 'enum', enum: OparlChunkSource })
  source: OparlChunkSource;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  paperId: UUID | null;

  @ManyToOne(() => OparlPaperRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paperId' })
  paper: Relation<OparlPaperRecord> | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  meetingId: UUID | null;

  @ManyToOne(() => OparlMeetingRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meetingId' })
  meeting: Relation<OparlMeetingRecord> | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  agendaItemId: UUID | null;

  @ManyToOne(() => OparlAgendaItemRecord, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'agendaItemId' })
  agendaItem: Relation<OparlAgendaItemRecord> | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  fileId: UUID | null;

  @ManyToOne(() => OparlFileRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: Relation<OparlFileRecord> | null;

  /** The paper's date, the meeting's day, or the file's. */
  @Column({ type: 'date', nullable: true })
  date: string | null;

  @Column({ type: 'integer', nullable: true })
  pageNumber: number | null;

  /** Position among the chunks of its source. */
  @Column({ type: 'integer' })
  ordinal: number;

  @Column({ type: 'text' })
  text: string;

  /** Hash of the object text the chunk was cut from (papers, meetings, agenda items). */
  @Column({ type: 'text', nullable: true })
  sourceHash: string | null;

  @Column({
    type: 'tsvector',
    generatedType: 'STORED',
    asExpression: `to_tsvector('german', "text")`,
    select: false,
  })
  searchVector: string;

  /** The model of the vector; search ignores vectors of another model than the current one. */
  @Column({ type: 'uuid', nullable: true })
  embeddingModelId: UUID | null;

  @ManyToOne(() => ModelRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'embeddingModelId' })
  embeddingModel: Relation<ModelRecord> | null;

  @Column({ type: 'halfvec', length: 1024, nullable: true, select: false })
  embedding1024: number[] | null;

  @Column({ type: 'halfvec', length: 1536, nullable: true, select: false })
  embedding1536: number[] | null;

  @Column({ type: 'halfvec', length: 2560, nullable: true, select: false })
  embedding2560: number[] | null;
}
