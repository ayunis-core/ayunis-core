import type { UUID } from 'crypto';
import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { WorkspaceTeamGrantRecord } from './workspace-team-grant.record';

@Entity({ name: 'workspace_team_member_overrides' })
@Index(['teamGrantId', 'userId'], { unique: true })
@Check(
  '("excluded" = true AND "role" IS NULL) OR ("excluded" = false AND "role" IS NOT NULL)',
)
export class WorkspaceTeamMemberOverrideRecord extends BaseRecord {
  @Column()
  teamGrantId: UUID;

  @ManyToOne(() => WorkspaceTeamGrantRecord, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teamGrantId' })
  teamGrant: WorkspaceTeamGrantRecord;

  @Column()
  @Index()
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @Column({ type: 'enum', enum: WorkspaceRole, nullable: true })
  role: WorkspaceRole | null;

  @Column({ type: 'boolean' })
  excluded: boolean;
}
