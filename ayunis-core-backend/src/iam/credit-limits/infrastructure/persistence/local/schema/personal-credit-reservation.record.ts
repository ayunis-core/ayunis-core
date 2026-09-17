import type { UUID } from 'crypto';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity('personal_credit_reservations')
@Index(['orgId', 'userId', 'expiresAt'])
export class PersonalCreditReservationRecord extends BaseRecord {
  @Column('uuid')
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  org: OrgRecord;

  @Column('uuid')
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  user: UserRecord;

  @Column('decimal', {
    precision: 16,
    scale: 6,
    transformer: decimalTransformer,
  })
  credits: number;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;
}
