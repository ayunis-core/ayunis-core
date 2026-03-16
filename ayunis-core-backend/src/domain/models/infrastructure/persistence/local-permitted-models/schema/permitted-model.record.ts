import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { Org } from '../../../../../../iam/orgs/domain/org.entity';
import { OrgRecord } from '../../../../../../iam/orgs/infrastructure/repositories/local/schema/org.record';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { ModelRecord } from '../../local-models/schema/model.record';
import { TeamRecord } from '../../../../../../iam/teams/infrastructure/repositories/local/schema/team.record';
import { PermittedModelScope } from '../../../../domain/value-objects/permitted-model-scope.enum';

@Entity({ name: 'permitted_models' })
@Index(['orgId', 'modelId'], { unique: true, where: `"scope" = 'org'` })
@Index(['scopeId', 'modelId'], { unique: true, where: `"scope" = 'team'` })
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

  @Column({ nullable: false, default: false })
  anonymousOnly: boolean;

  @Column({
    type: 'enum',
    enum: PermittedModelScope,
    default: PermittedModelScope.ORG,
  })
  scope: PermittedModelScope;

  @Column({ name: 'scope_id', nullable: true })
  scopeId: UUID | null;

  @ManyToOne(() => TeamRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scope_id' })
  team: TeamRecord | null;
}
