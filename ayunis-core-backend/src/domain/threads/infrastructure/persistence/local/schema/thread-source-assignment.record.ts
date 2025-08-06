import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UUID } from 'crypto';
import { ThreadRecord } from './thread.record';
import { SourceRecord } from '../../../../../sources/infrastructure/persistence/local/schema/source.record';
import { BaseRecord } from '../../../../../../common/db/base-record';

@Entity({ name: 'thread_source_assignments' })
export class ThreadSourceAssignmentRecord extends BaseRecord {
  @Column()
  @Index()
  threadId: UUID;

  @ManyToOne(() => ThreadRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'threadId' })
  thread: ThreadRecord;

  @Column()
  @Index()
  sourceId: UUID;

  @ManyToOne(() => SourceRecord, {
    onDelete: 'CASCADE',
    cascade: true,
    eager: true,
  })
  @JoinColumn({ name: 'sourceId' })
  source: SourceRecord;
}
