import { BaseRecord } from 'src/common/db/base-record';
import { Entity, Column, JoinColumn, OneToOne } from 'typeorm';
import { SubscriptionRecord } from './subscription.record';
import type { UUID } from 'crypto';

@Entity({ name: 'subscription_billing_infos' })
export class SubscriptionBillingInfoRecord extends BaseRecord {
  @Column()
  companyName: string;

  @Column({ type: 'varchar', nullable: true })
  subText: string | null;

  @Column()
  street: string;

  @Column()
  houseNumber: string;

  @Column()
  postalCode: string;

  @Column()
  city: string;

  @Column()
  country: string;

  @Column({ type: 'varchar', nullable: true })
  vatNumber: string | null;

  @OneToOne(
    () => SubscriptionRecord,
    (subscription) => subscription.billingInfo,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn()
  subscription: SubscriptionRecord;

  @Column()
  subscriptionId: UUID;
}
