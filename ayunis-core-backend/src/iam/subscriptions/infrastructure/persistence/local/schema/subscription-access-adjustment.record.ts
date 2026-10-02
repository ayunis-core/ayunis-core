import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { SubscriptionRecord } from './subscription.record';

@Entity({ name: 'subscription_access_adjustments' })
export class SubscriptionAccessAdjustmentRecord extends BaseRecord {
  @Column({ type: 'uuid' })
  subscriptionId: UUID;

  @ManyToOne(() => SubscriptionRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: SubscriptionRecord;

  @Column({ type: 'uuid' })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ type: 'uuid', nullable: true })
  changedByUserId: UUID | null;

  @ManyToOne(() => UserRecord, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changedByUserId' })
  changedByUser: UserRecord | null;

  @Column({ type: 'timestamp', nullable: true })
  previousAccessEndsAt: Date | null;

  @Column({ type: 'timestamp' })
  accessEndsAt: Date;

  @Column({ type: 'varchar', length: 500 })
  reason: string;
}
