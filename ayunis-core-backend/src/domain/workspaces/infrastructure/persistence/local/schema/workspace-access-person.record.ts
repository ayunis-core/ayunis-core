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
import { WorkspaceRecord } from './workspace.record';

@Entity({ name: 'workspace_access_people' })
@Unique('UQ_workspace_access_people_workspace_user', ['workspaceId', 'userId'])
@Check(
  'CHK_workspace_access_people_level',
  `"accessLevel" IN ('use', 'edit', 'full')`,
)
export class WorkspaceAccessPersonRecord extends BaseRecord {
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

  @Column({ type: 'varchar', length: 16 })
  accessLevel: WorkspaceGrantLevel;
}
