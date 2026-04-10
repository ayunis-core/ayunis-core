import { UUID } from 'crypto';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { OrgRecord } from '../../../../../../iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from '../../../../../../iam/users/infrastructure/repositories/local/schema/user.record';
import { ThreadRecord } from './thread.record';

/**
 * Generated images live in the threads module because they are thread-owned
 * and cascade-deleted with the thread.
 */
@Entity({ name: 'generated_images' })
@Index(['storageKey'], { unique: true })
export class GeneratedImageRecord extends BaseRecord {
  @Column()
  @Index()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column()
  @Index()
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @Column()
  @Index()
  threadId: UUID;

  @ManyToOne(() => ThreadRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'threadId' })
  thread: ThreadRecord;

  @Column()
  contentType: string;

  @Column({ default: false })
  isAnonymous: boolean;

  @Column({ type: 'text' })
  storageKey: string;
}
