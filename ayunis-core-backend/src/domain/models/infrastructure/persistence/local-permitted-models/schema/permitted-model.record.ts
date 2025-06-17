import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { ModelProvider } from '../../../../domain/value-objects/model-provider.object';
import { Org } from '../../../../../../iam/orgs/domain/org.entity';
import { OrgRecord } from '../../../../../../iam/orgs/infrastructure/repositories/local/schema/org.record';
import { Column, Entity, ManyToOne } from 'typeorm';

@Entity({ name: 'permitted_models' })
export class PermittedModelRecord extends BaseRecord {
  @Column({ nullable: false })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  org: Org;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false, type: 'enum', enum: ModelProvider })
  provider: ModelProvider;

  // default for organization
  @Column({ nullable: false })
  isDefault: boolean;
}
