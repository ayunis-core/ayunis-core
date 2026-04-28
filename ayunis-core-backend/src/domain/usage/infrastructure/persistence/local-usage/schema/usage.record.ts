import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UUID } from 'crypto';
import { UserRecord } from '../../../../../../iam/users/infrastructure/repositories/local/schema/user.record';
import { OrgRecord } from '../../../../../../iam/orgs/infrastructure/repositories/local/schema/org.record';
import { ApiKeyRecord } from '../../../../../../iam/api-keys/infrastructure/repositories/local/schema/api-key.record';
import { ModelRecord } from '../../../../../models/infrastructure/persistence/local-models/schema/model.record';
import { ModelProvider } from '../../../../../models/domain/value-objects/model-provider.enum';

const decimalTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? null : Number(value),
};

/**
 * All costs are stored in EUR.
 *
 * On insert, each row attributes usage to exactly one principal: either a
 * user (`userId`) or an API key (`apiKeyId`). This is enforced at write time
 * by the `Usage` domain entity. After a principal is deleted, the FK is
 * set to NULL — so existing rows may have both columns null. Org-level
 * aggregates (`organizationId`) remain valid regardless.
 */
@Entity('usage')
@Index(['organizationId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['apiKeyId', 'createdAt'])
@Index(['modelId', 'createdAt'])
@Index(['provider', 'createdAt'])
@Index(['organizationId', 'provider', 'createdAt'])
export class UsageRecord extends BaseRecord {
  @Column({ nullable: true })
  userId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord | null;

  @Column({ nullable: true })
  apiKeyId: UUID | null;

  @ManyToOne(() => ApiKeyRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'apiKeyId' })
  apiKey: ApiKeyRecord | null;

  @Column('uuid')
  organizationId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  organization: OrgRecord;

  @Column('uuid')
  modelId: UUID;

  @ManyToOne(() => ModelRecord, { nullable: false, onDelete: 'NO ACTION' })
  model: ModelRecord;

  @Column({
    type: 'enum',
    enum: ModelProvider,
  })
  provider: ModelProvider;

  @Column('integer')
  inputTokens: number;

  @Column('integer')
  outputTokens: number;

  @Column('integer')
  totalTokens: number;

  /** Cost in EUR */
  @Column('decimal', {
    precision: 10,
    scale: 6,
    nullable: true,
    transformer: decimalTransformer,
  })
  cost: number | null;

  @Column('decimal', {
    precision: 16,
    scale: 6,
    nullable: true,
    transformer: decimalTransformer,
  })
  creditsConsumed: number | null;

  @Column('uuid')
  requestId: UUID;
}
