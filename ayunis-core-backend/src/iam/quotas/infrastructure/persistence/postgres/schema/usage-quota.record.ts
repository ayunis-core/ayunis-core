import { Entity, Column, Index, Check, JoinColumn, ManyToOne } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UserRecord } from '../../../../../users/infrastructure/repositories/local/schema/user.record';
import { ApiKeyRecord } from '../../../../../api-keys/infrastructure/repositories/local/schema/api-key.record';
import { QuotaType } from '../../../../domain/quota-type.enum';
import { UUID } from 'crypto';

// One quota row per principal × quotaType. The principal is either a user or
// an api-key — exactly one anchor column is set, enforced by the CHECK below
// and by partial unique indexes per anchor kind.
@Entity('usage_quotas')
@Check(
  'CHK_usage_quotas_principal',
  '("userId" IS NULL) <> ("apiKeyId" IS NULL)',
)
@Index('UQ_usage_quotas_user_quota', ['userId', 'quotaType'], {
  unique: true,
  where: '"apiKeyId" IS NULL',
})
@Index('UQ_usage_quotas_apikey_quota', ['apiKeyId', 'quotaType'], {
  unique: true,
  where: '"userId" IS NULL',
})
export class UsageQuotaRecord extends BaseRecord {
  @Column('uuid', { nullable: true })
  userId: UUID | null;

  @ManyToOne(() => UserRecord, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: UserRecord | null;

  @Column('uuid', { nullable: true })
  apiKeyId: UUID | null;

  @ManyToOne(() => ApiKeyRecord, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'apiKeyId' })
  apiKey: ApiKeyRecord | null;

  @Column({ type: 'enum', enum: QuotaType })
  quotaType: QuotaType;

  @Column('integer', { default: 0 })
  count: number;

  @Column('timestamp')
  windowStartAt: Date;

  @Column('bigint')
  windowDurationMs: string;
}
