import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { Org } from '../../../../../../iam/orgs/domain/org.entity';
import { OrgRecord } from '../../../../../../iam/orgs/infrastructure/repositories/local/schema/org.record';
import { Column, Entity, ManyToOne } from 'typeorm';
import { ModelRecord } from '../../local-models/schema/model.record';

@Entity({ name: 'permitted_models' })
export class PermittedModelRecord extends BaseRecord {
  @Column({ nullable: false })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  org: Org;

  @ManyToOne(() => ModelRecord, { onDelete: 'CASCADE', eager: true })
  model: ModelRecord;

  @Column({ nullable: false })
  modelId: UUID;

  // default for organization
  @Column({ nullable: false })
  isDefault: boolean;
}
