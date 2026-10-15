import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { WorkspaceRecord } from './workspace.record';

@Entity({ name: 'workspace_access_org_exclusions' })
@Unique('UQ_workspace_access_org_exclusions_workspace_user', [
  'workspaceId',
  'userId',
])
export class WorkspaceAccessOrgExclusionRecord extends BaseRecord {
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
}
