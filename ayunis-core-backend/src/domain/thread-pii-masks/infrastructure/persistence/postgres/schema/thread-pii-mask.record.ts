import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { ThreadRecord } from '../../../../../threads/infrastructure/persistence/local/schema/thread.record';
import { PiiCategory } from '../../../../../../common/anonymization/domain/pii-category.enum';

@Entity({ name: 'thread_pii_masks' })
@Unique(['threadId', 'category', 'maskIndex'])
@Unique(['threadId', 'category', 'value'])
export class ThreadPiiMaskRecord extends BaseRecord {
  @Index()
  @Column()
  threadId: UUID;

  @ManyToOne(() => ThreadRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'threadId' })
  thread: ThreadRecord;

  @Column({ type: 'enum', enum: PiiCategory })
  category: PiiCategory;

  @Column({ type: 'int' })
  maskIndex: number;

  @Column({ type: 'text' })
  value: string;
}
