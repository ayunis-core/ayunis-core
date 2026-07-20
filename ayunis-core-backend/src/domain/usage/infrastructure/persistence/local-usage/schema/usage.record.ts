import { Entity, Column, Index, ManyToOne, Check } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { UUID } from 'crypto';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { ModelRecord } from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';
import { ApiKeyRecord } from 'src/iam/api-keys/infrastructure/repositories/local/schema/api-key.record';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

const decimalTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? null : Number(value),
};

/**
 * All costs are stored in EUR.
 */
@Entity('usage')
@Index(['organizationId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['apiKeyId', 'createdAt'])
@Index(['modelId', 'createdAt'])
@Index(['provider', 'createdAt'])
@Index(['organizationId', 'provider', 'createdAt'])
@Check('CHK_usage_principal_not_both', `"userId" IS NULL OR "apiKeyId" IS NULL`)
export class UsageRecord extends BaseRecord {
  @Column({ nullable: true })
  userId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'SET NULL' })
  user: UserRecord | null;

  @Column({ nullable: true })
  apiKeyId: UUID | null;

  @ManyToOne(() => ApiKeyRecord, { nullable: true, onDelete: 'SET NULL' })
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
