import type { UUID } from 'crypto';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { SourceRecord } from './source.record';

/**
 * One timed segment of a recording's transcript. The provider's speaker label
 * is kept apart from the text, so it can later be mapped to a name.
 */
@Entity({ name: 'source_transcript_segments' })
@Index(['sourceId', 'position'], { unique: true })
export class SourceTranscriptSegmentRecord extends BaseRecord {
  @Column()
  sourceId: UUID;

  @ManyToOne(() => SourceRecord, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'sourceId' })
  source: SourceRecord;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'double precision' })
  startSeconds: number;

  @Column({ type: 'double precision' })
  endSeconds: number;

  @Column({ type: 'varchar', nullable: true })
  speaker: string | null;

  @Column({ type: 'text' })
  text: string;
}
