import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { RoutineRecord } from 'src/domain/routines/infrastructure/persistence/local/schema/routine.record';
import { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';
import {
  NOTIFICATION_HEADLINE_MAX_LENGTH,
  NOTIFICATION_SUBHEADLINE_MAX_LENGTH,
} from 'src/domain/notifications/domain/notifications.constants';

@Entity({ name: 'notifications' })
@Index(['userId', 'createdAt'])
@Index(['orgId', 'createdAt'])
export class NotificationRecord extends BaseRecord {
  /** Deleting the user deletes their notifications. */
  @Column()
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @Column()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'varchar', length: NOTIFICATION_HEADLINE_MAX_LENGTH })
  headline: string;

  @Column({ type: 'varchar', length: NOTIFICATION_SUBHEADLINE_MAX_LENGTH })
  subheadline: string;

  @Column({ type: 'text' })
  body: string;

  /** Deleting the routine keeps the notification; only the link goes. */
  @Column({ type: 'varchar', nullable: true })
  @Index()
  routineId: UUID | null;

  @ManyToOne(() => RoutineRecord, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'routineId' })
  routine?: RoutineRecord;

  /** Deleting the thread keeps the notification; only the link goes. */
  @Column({ type: 'varchar', nullable: true })
  @Index()
  routineThreadId: UUID | null;

  @ManyToOne(() => ThreadRecord, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'routineThreadId' })
  routineThread?: ThreadRecord;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;
}
