import { Entity, Column, Index } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UUID } from 'crypto';

@Entity('usage')
@Index(['organizationId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['modelId', 'createdAt'])
@Index(['provider', 'createdAt'])
@Index(['organizationId', 'provider', 'createdAt'])
export class UsageRecord extends BaseRecord {
  @Column('uuid')
  userId: UUID;

  @Column('uuid')
  organizationId: UUID;

  @Column('uuid')
  modelId: UUID;

  @Column('varchar', { length: 50 })
  provider: string;

  @Column('integer')
  inputTokens: number;

  @Column('integer')
  outputTokens: number;

  @Column('integer')
  totalTokens: number;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  cost: number | null;

  @Column('varchar', { length: 3, nullable: true })
  currency: string | null;

  @Column('uuid')
  requestId: UUID;
}
