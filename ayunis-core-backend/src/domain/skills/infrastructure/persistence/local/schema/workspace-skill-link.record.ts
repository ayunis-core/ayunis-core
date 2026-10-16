import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import type { UUID } from 'crypto';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';
import { SkillRecord } from './skill.record';

@Entity({ name: 'workspace_skill_links' })
@Index('UQ_workspace_skill_links_workspace_skill', ['workspaceId', 'skillId'], {
  unique: true,
})
export class WorkspaceSkillLinkRecord {
  @PrimaryColumn('uuid')
  id: UUID;

  @Column({ nullable: false })
  workspaceId: UUID;

  @ManyToOne(() => WorkspaceRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord;

  @Index()
  @Column({ nullable: false })
  skillId: UUID;

  @ManyToOne(() => SkillRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skillId' })
  skill: SkillRecord;

  @Column({ type: 'varchar', nullable: true })
  linkedByUserId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linkedByUserId' })
  linkedBy: UserRecord | null;

  @CreateDateColumn()
  createdAt: Date;
}
