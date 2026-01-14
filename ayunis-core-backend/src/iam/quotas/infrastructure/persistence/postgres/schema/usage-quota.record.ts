import { Entity, Column, Index, ManyToOne, Unique } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UserRecord } from '../../../../../users/infrastructure/repositories/local/schema/user.record';
import { QuotaType } from '../../../../domain/quota-type.enum';
import { UUID } from 'crypto';

@Entity('usage_quotas')
@Index(['userId', 'quotaType'])
@Unique(['userId', 'quotaType'])
export class UsageQuotaRecord extends BaseRecord {
  @Column('uuid')
  userId: UUID;

  @ManyToOne(() => UserRecord, { onDelete: 'CASCADE' })
  user: UserRecord;

  @Column({ type: 'enum', enum: QuotaType })
  quotaType: QuotaType;

  @Column('integer', { default: 0 })
  count: number;

  @Column('timestamp')
  windowStartAt: Date;

  @Column('bigint')
  windowDurationMs: string;
}
