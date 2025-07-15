import { BaseRecord } from '../../../../../../common/db/base-record';
import { Entity, Column, JoinColumn, OneToOne } from 'typeorm';
import { SubscriptionRecord } from './subscription.record';
import { UUID } from 'crypto';

@Entity({ name: 'subscription_billing_infos' })
export class SubscriptionBillingInfoRecord extends BaseRecord {
  @Column()
  companyName: string;

  @Column({ nullable: true })
  subText?: string;

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

  @Column({ nullable: true })
  vatNumber?: string;

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
