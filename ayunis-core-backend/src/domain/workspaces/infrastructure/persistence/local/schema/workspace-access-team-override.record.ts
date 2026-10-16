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
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import type { WorkspaceGrantLevel } from 'src/domain/workspaces/domain/workspace-access-level';
import { WorkspaceAccessTeamRecord } from './workspace-access-team.record';
import { WorkspaceRecord } from './workspace.record';

@Entity({ name: 'workspace_access_team_overrides' })
@Unique('UQ_workspace_access_team_overrides_grant_user', [
  'teamGrantId',
  'userId',
])
@Check(
  'CHK_workspace_access_team_overrides_level',
  `("excluded" AND "accessLevel" IS NULL) OR (NOT "excluded" AND "accessLevel" IN ('use', 'edit', 'full'))`,
)
export class WorkspaceAccessTeamOverrideRecord extends BaseRecord {
  @Column()
  teamGrantId: UUID;

  @ManyToOne(() => WorkspaceAccessTeamRecord, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teamGrantId' })
  teamGrant: WorkspaceAccessTeamRecord;

  @Index()
  @Column()
  workspaceId: UUID;

  @ManyToOne(() => WorkspaceRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord;

  @Index()
  @Column()
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @Column({ type: 'varchar', length: 16, nullable: true })
  accessLevel: WorkspaceGrantLevel | null;

  @Column({ default: false })
  excluded: boolean;
}
