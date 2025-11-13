import { UUID } from 'crypto';
import { ModelProvider } from '../../../../domain/value-objects/model-provider.enum';
import { OrgRecord } from '../../../../../../iam/orgs/infrastructure/repositories/local/schema/org.record';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';

@Entity({ name: 'permitted_providers' })
@Index(['orgId', 'provider'], { unique: true })
export class PermittedProviderRecord extends BaseRecord {
  @Column({ type: 'enum', enum: ModelProvider })
  provider: ModelProvider;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE', nullable: false })
  org: OrgRecord;

  @Column({ type: 'uuid' })
  orgId: UUID;
}
