import { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { BillingCycle } from 'src/iam/subscriptions/domain/value-objects/billing-cycle.enum';
import { Entity, OneToOne, JoinColumn, Column } from 'typeorm';

@Entity({ name: 'subscriptions' })
export class SubscriptionRecord extends BaseRecord {
  @Column({ nullable: true })
  cancelledAt: Date | null;

  @OneToOne(() => OrgRecord)
  @JoinColumn()
  org: OrgRecord;

  @Column()
  orgId: UUID;

  @Column('decimal', { precision: 10, scale: 2 })
  pricePerSeat: number;

  @Column({
    type: 'enum',
    enum: BillingCycle,
  })
  billingCycle: BillingCycle;

  @Column()
  billingCycleAnchor: Date;
}
