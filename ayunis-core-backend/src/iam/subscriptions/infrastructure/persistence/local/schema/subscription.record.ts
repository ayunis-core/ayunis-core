import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { OrgRecord } from '../../../../../orgs/infrastructure/repositories/local/schema/org.record';
import { RenewalCycle } from '../../../../domain/value-objects/renewal-cycle.enum';
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
