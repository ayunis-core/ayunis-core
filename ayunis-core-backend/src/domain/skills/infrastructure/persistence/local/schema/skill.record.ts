import {
  Check,
  Column,
  Entity,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { UUID } from 'crypto';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import { McpIntegrationRecord } from 'src/domain/mcp/infrastructure/persistence/postgres/schema/mcp-integration.record';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';

@Entity({ name: 'skills' })
@Check(
  'CHK_skills_exactly_one_owner',
  '("userId" IS NOT NULL AND "workspaceId" IS NULL AND "teamId" IS NULL AND "orgId" IS NULL) OR ("workspaceId" IS NOT NULL AND "userId" IS NULL AND "teamId" IS NULL AND "orgId" IS NULL) OR ("teamId" IS NOT NULL AND "orgId" IS NOT NULL AND "userId" IS NULL AND "workspaceId" IS NULL) OR ("orgId" IS NOT NULL AND "userId" IS NULL AND "workspaceId" IS NULL AND "teamId" IS NULL)',
)
@Check(
  'CHK_skills_mandatory_org_only',
  '"isMandatory" = false OR ("orgId" IS NOT NULL AND "teamId" IS NULL)',
)
@Index('IDX_skills_mandatory_org', ['orgId'], { where: '"isMandatory" = true' })
@Index(['name', 'userId'], { unique: true, where: '"workspaceId" IS NULL' })
@Index(['name', 'workspaceId'], {
  unique: true,
  where: '"workspaceId" IS NOT NULL',
})
@Index('UQ_skills_name_team', ['name', 'teamId'], {
  unique: true,
  where: '"teamId" IS NOT NULL',
})
@Index('UQ_skills_name_org', ['name', 'orgId'], {
  unique: true,
  where: '"orgId" IS NOT NULL AND "teamId" IS NULL',
})
export class SkillRecord extends BaseRecord {
  @Column({ type: 'boolean', default: false })
  isMandatory: boolean;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  shortDescription: string;

  @Column({ nullable: false })
  instructions: string;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  marketplaceIdentifier: string | null;

  @Column({ type: 'varchar', nullable: true })
  userId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  workspaceId: UUID | null;

  @ManyToOne(() => WorkspaceRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  teamId: UUID | null;

  @ManyToOne(() => TeamRecord, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'teamId' })
  team: TeamRecord | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  orgId: UUID | null;

  @ManyToOne(() => OrgRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord | null;

  @Column({ type: 'varchar', nullable: true })
  submittedByUserId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'submittedByUserId' })
  submittedBy?: UserRecord | null;

  @ManyToMany(() => SourceRecord)
  @JoinTable({ name: 'skill_sources' })
  sources?: SourceRecord[];

  @ManyToMany(() => McpIntegrationRecord)
  @JoinTable({ name: 'skill_mcp_integrations' })
  mcpIntegrations?: McpIntegrationRecord[];
}
