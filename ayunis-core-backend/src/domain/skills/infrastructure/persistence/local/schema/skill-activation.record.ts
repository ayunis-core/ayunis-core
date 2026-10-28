import {
  Entity,
  Column,
  ManyToOne,
  PrimaryColumn,
  CreateDateColumn,
  Check,
  Index,
  JoinColumn,
} from 'typeorm';
import { UUID } from 'crypto';
import { SkillRecord } from './skill.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';

@Entity({ name: 'skill_activations' })
@Check(
  'CHK_skill_activations_exactly_one_scope',
  '("userId" IS NOT NULL AND "workspaceId" IS NULL) OR ("userId" IS NULL AND "workspaceId" IS NOT NULL)',
)
@Index('UQ_skill_activation_skill_user', ['skillId', 'userId'], {
  unique: true,
  where: '"userId" IS NOT NULL',
})
@Index('UQ_skill_activation_skill_workspace', ['skillId', 'workspaceId'], {
  unique: true,
  where: '"workspaceId" IS NOT NULL',
})
export class SkillActivationRecord {
  @PrimaryColumn('uuid')
  id: UUID;

  @Column({ nullable: false })
  skillId: UUID;

  @Column({ nullable: true })
  userId: UUID | null;

  @ManyToOne(() => SkillRecord, { nullable: false, onDelete: 'CASCADE' })
  skill: SkillRecord;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'CASCADE' })
  user: UserRecord | null;

  @Column({ nullable: true })
  workspaceId: UUID | null;

  @ManyToOne(() => WorkspaceRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord | null;

  @Column({ default: false })
  isPinned: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
