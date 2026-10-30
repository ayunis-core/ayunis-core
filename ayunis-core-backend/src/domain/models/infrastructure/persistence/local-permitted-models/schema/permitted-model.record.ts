import { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  VirtualColumn,
} from 'typeorm';
import { ModelRecord } from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';

@Entity({ name: 'permitted_models' })
@Index(['orgId', 'modelId'], { unique: true, where: `"scope" = 'org'` })
@Index(['scopeId', 'modelId'], { unique: true, where: `"scope" = 'team'` })
@Check(
  'CHK_permitted_models_scope_team',
  `("scope" = 'org' AND "scope_id" IS NULL) OR ("scope" = 'team' AND "scope_id" IS NOT NULL)`,
)
export class PermittedModelRecord extends BaseRecord {
  @Column({ nullable: false })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  org: Org;

  @ManyToOne(() => ModelRecord, { onDelete: 'CASCADE', eager: true })
  model: ModelRecord;

  @Column({ nullable: false })
  modelId: UUID;

  /**
   * Whether this permit is its org's or team's default. Stored in
   * default_model_selections; a user's personal default does not count.
   */
  @VirtualColumn({
    type: 'boolean',
    query: (alias) =>
      `SELECT EXISTS (SELECT 1 FROM default_model_selections d WHERE d."permittedModelId" = ${alias}.id AND (d."orgId" IS NOT NULL OR d."teamId" IS NOT NULL))`,
  })
  isDefault?: boolean;

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
