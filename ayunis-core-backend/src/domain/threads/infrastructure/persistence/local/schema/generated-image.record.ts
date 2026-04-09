import { UUID } from 'crypto';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { ThreadRecord } from './thread.record';

@Entity({ name: 'generated_images' })
@Index(['storageKey'], { unique: true })
export class GeneratedImageRecord extends BaseRecord {
  @Column()
  @Index()
  orgId: UUID;

  @Column()
  @Index()
  userId: UUID;

  @Column()
  @Index()
  threadId: UUID;

  @ManyToOne(() => ThreadRecord, (thread) => thread.generatedImages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'threadId' })
  thread: ThreadRecord;

  @Column()
  contentType: string;

  @Column({ default: false })
  isAnonymous: boolean;

  @Column({ type: 'text' })
  storageKey: string;
}
