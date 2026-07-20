import { Entity, Column, Index, ManyToOne, Unique } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { QuotaType } from 'src/iam/quotas/domain/quota-type.enum';
import { UUID } from 'crypto';

const bigintToNumberTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity('usage_quotas')
@Index(['userId', 'quotaType'])
@Unique(['userId', 'quotaType'])
export class UsageQuotaRecord extends BaseRecord {
  @Column()
  userId: UUID;

  @ManyToOne(() => UserRecord, { onDelete: 'CASCADE' })
  user: UserRecord;

  @Column({ type: 'enum', enum: QuotaType })
  quotaType: QuotaType;

  @Column('integer', { default: 0 })
  count: number;

  @Column('timestamp')
  windowStartAt: Date;

  @Column({ type: 'bigint', transformer: bigintToNumberTransformer })
  windowDurationMs: number;
}
