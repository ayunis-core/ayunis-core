import { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { PermittedModelRecord } from 'src/domain/models/infrastructure/persistence/local-permitted-models/schema/permitted-model.record';

export enum DefaultModelSelectionKind {
  MODEL = 'model',
  MODE = 'mode',
}

@Entity({ name: 'default_model_selections' })
@Check(`num_nonnulls("userId", "teamId", "orgId") = 1`)
@Check(`("kind" = 'model') = ("permittedModelId" IS NOT NULL)`)
@Check(`("kind" = 'mode') = ("mode" IS NOT NULL)`)
@Index(['userId'], { unique: true, where: '"userId" IS NOT NULL' })
@Index(['teamId'], { unique: true, where: '"teamId" IS NOT NULL' })
@Index(['orgId'], { unique: true, where: '"orgId" IS NOT NULL' })
export class DefaultModelSelectionRecord extends BaseRecord {
  @Column({ nullable: true })
  userId: UUID | null;

  @ManyToOne(() => UserRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: UserRecord;

  @Column({ nullable: true })
  teamId: UUID | null;

  @ManyToOne(() => TeamRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team?: TeamRecord;

  @Column({ nullable: true })
  orgId: UUID | null;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org?: OrgRecord;

  @Column({ type: 'enum', enum: DefaultModelSelectionKind })
  kind: DefaultModelSelectionKind;

  @Column({ nullable: true })
  @Index()
  permittedModelId: UUID | null;

  @ManyToOne(() => PermittedModelRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permittedModelId' })
  permittedModel?: PermittedModelRecord | null;

  @Column({ type: 'enum', enum: ModelMode, nullable: true })
  mode: ModelMode | null;
}
