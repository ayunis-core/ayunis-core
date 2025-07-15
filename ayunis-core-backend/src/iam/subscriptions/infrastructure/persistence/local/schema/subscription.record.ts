import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { OrgRecord } from '../../../../../orgs/infrastructure/repositories/local/schema/org.record';
import { RenewalCycle } from '../../../../domain/value-objects/renewal-cycle.enum';
import { Entity, OneToOne, Column, Index, ManyToOne } from 'typeorm';
import { SubscriptionBillingInfoRecord } from './subscription-billing-info.record';

@Entity({ name: 'subscriptions' })
export class SubscriptionRecord extends BaseRecord {
  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @ManyToOne(() => OrgRecord)
  org: OrgRecord;

  @Column()
  @Index()
  orgId: UUID;

  @Column()
  noOfSeats: number;

  @Column('decimal', { precision: 10, scale: 2 })
  pricePerSeat: number;

  @Column({
    type: 'enum',
    enum: RenewalCycle,
  })
  renewalCycle: RenewalCycle;

  @Column()
  renewalCycleAnchor: Date;

  @OneToOne(
    () => SubscriptionBillingInfoRecord,
    (billingInfo) => billingInfo.subscription,
    {
      cascade: true,
      eager: true,
    },
  )
  billingInfo: SubscriptionBillingInfoRecord;
}
