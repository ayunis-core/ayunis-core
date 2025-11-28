import { UUID } from 'crypto';
import { ModelProvider } from '../../../../domain/value-objects/model-provider.enum';
import { OrgRecord } from '../../../../../../iam/orgs/infrastructure/repositories/local/schema/org.record';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'permitted_providers' })
@Index(['orgId', 'provider'], { unique: true })
export class PermittedProviderRecord {
  @PrimaryColumn({ type: 'uuid' })
  id: UUID;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'enum', enum: ModelProvider })
  provider: ModelProvider;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE', nullable: false })
  org: OrgRecord;

  @Column({ type: 'uuid' })
  orgId: UUID;
}
