import { Entity, Column, Index, ManyToOne } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UUID } from 'crypto';
import { UserRecord } from '../../../../../../iam/users/infrastructure/repositories/local/schema/user.record';
import { OrgRecord } from '../../../../../../iam/orgs/infrastructure/repositories/local/schema/org.record';
import { ModelRecord } from '../../../../../models/infrastructure/persistence/local-models/schema/model.record';
import { ModelProvider } from '../../../../../models/domain/value-objects/model-provider.enum';
import { Currency } from '../../../../../models/domain/value-objects/currency.enum';

@Entity('usage')
@Index(['organizationId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['modelId', 'createdAt'])
@Index(['provider', 'createdAt'])
@Index(['organizationId', 'provider', 'createdAt'])
export class UsageRecord extends BaseRecord {
  @Column('uuid')
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  user: UserRecord;

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

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  cost: number | null;

  @Column({
    type: 'enum',
    enum: Currency,
    nullable: true,
  })
  currency: Currency | null;

  @Column('uuid')
  requestId: UUID;
}
