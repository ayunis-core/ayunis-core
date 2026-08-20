import type { UUID } from 'crypto';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { WorkspaceRecord } from './workspace.record';

@Entity({ name: 'workspace_members' })
@Index(['workspaceId', 'userId'], { unique: true })
export class WorkspaceMemberRecord extends BaseRecord {
  @Column()
  workspaceId: UUID;

  @ManyToOne(() => WorkspaceRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord;

  @Column()
  @Index()
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @Column({ type: 'enum', enum: WorkspaceRole })
  role: WorkspaceRole;

  @Column({ type: 'enum', enum: WorkspaceMemberStatus })
  status: WorkspaceMemberStatus;
}
