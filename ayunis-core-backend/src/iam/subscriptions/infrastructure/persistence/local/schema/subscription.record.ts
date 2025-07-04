import { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { Entity, OneToOne, JoinColumn, Column, Index } from 'typeorm';

@Entity({ name: 'subscriptions' })
export class SubscriptionRecord extends BaseRecord {
  @Column({ nullable: true })
  cancelledAt?: Date;

  @OneToOne(() => OrgRecord)
  @JoinColumn()
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
}
