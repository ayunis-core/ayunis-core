import type { UUID } from 'crypto';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import { WorkspaceRecord } from './workspace.record';

@Entity({ name: 'workspace_team_grants' })
@Index(['workspaceId', 'teamId'], { unique: true })
export class WorkspaceTeamGrantRecord extends BaseRecord {
  @Column()
  workspaceId: UUID;

  @ManyToOne(() => WorkspaceRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord;

  @Column()
  @Index()
  teamId: UUID;

  @ManyToOne(() => TeamRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: TeamRecord;

  @Column({ name: 'role', type: 'enum', enum: WorkspaceAccessLevel })
  accessLevel: WorkspaceAccessLevel;
}
