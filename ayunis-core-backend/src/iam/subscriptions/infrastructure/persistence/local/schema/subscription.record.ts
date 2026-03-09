import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { OrgRecord } from '../../../../../orgs/infrastructure/repositories/local/schema/org.record';
import { RenewalCycle } from '../../../../domain/value-objects/renewal-cycle.enum';
import { SubscriptionType } from '../../../../domain/value-objects/subscription-type.enum';
import {
  Entity,
  OneToOne,
  Column,
  Index,
  ManyToOne,
  TableInheritance,
  ChildEntity,
} from 'typeorm';
import { SubscriptionBillingInfoRecord } from './subscription-billing-info.record';

const decimalTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? null : Number(value),
};

@Entity({ name: 'subscriptions' })
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class SubscriptionRecord extends BaseRecord {
  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  org: OrgRecord;

  @Column()
  @Index()
  orgId: UUID;

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

@ChildEntity(SubscriptionType.SEAT_BASED)
export class SeatBasedSubscriptionRecord extends SubscriptionRecord {
  @Column({ type: 'int', nullable: true })
  noOfSeats: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  pricePerSeat: number | null;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  renewalCycle: RenewalCycle | null;

  @Column({ type: 'timestamp', nullable: true })
  renewalCycleAnchor: Date | null;
}

@ChildEntity(SubscriptionType.USAGE_BASED)
export class UsageBasedSubscriptionRecord extends SubscriptionRecord {
  @Column({
    type: 'decimal',
    precision: 16,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  monthlyCredits: number | null;
}
