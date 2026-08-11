import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { WorkspaceRecord } from './workspace.record';

/**
 * Per-user workspace preferences. Pinning and manual sidebar order are how a
 * user arranges *their* sidebar, not properties of the workspace itself — kept
 * off the workspace row so iteration 4's shared workspaces don't make
 * collaborators fight over one pin state. Follows the `skill_activations`
 * per-user-state precedent.
 */
@Entity({ name: 'workspace_user_settings' })
@Unique('UQ_workspace_user_settings_workspace_user', ['workspaceId', 'userId'])
export class WorkspaceUserSettingsRecord extends BaseRecord {
  @Column()
  @Index()
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

  @Column({ default: false })
  isPinned: boolean;

  /** Position in the user's manual order; null = never ordered, sorts last. */
  @Column({ type: 'int', nullable: true })
  sortOrder: number | null;
}
