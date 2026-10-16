import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import type { WorkspaceGrantLevel } from 'src/domain/workspaces/domain/workspace-access-level';
import { WorkspaceRecord } from './workspace.record';

@Entity({ name: 'workspace_access_teams' })
@Unique('UQ_workspace_access_teams_workspace_team', ['workspaceId', 'teamId'])
@Check(
  'CHK_workspace_access_teams_level',
  `"accessLevel" IN ('use', 'edit', 'full')`,
)
export class WorkspaceAccessTeamRecord extends BaseRecord {
  @Column()
  workspaceId: UUID;

  @ManyToOne(() => WorkspaceRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord;

  @Index()
  @Column()
  teamId: UUID;

  @ManyToOne(() => TeamRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: TeamRecord;

  @Column({ type: 'varchar', length: 16 })
  accessLevel: WorkspaceGrantLevel;

  @Column({ type: 'timestamp' })
  grantedAt: Date;
}
