import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';
import { WorkspaceRecord } from './workspace.record';

@Entity({ name: 'workspace_skill_assignments' })
@Unique(['workspaceId', 'skillId'])
export class WorkspaceSkillAssignmentRecord extends BaseRecord {
  @Column()
  @Index()
  workspaceId: UUID;

  @ManyToOne(() => WorkspaceRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord;

  @Column()
  @Index()
  skillId: UUID;

  @ManyToOne(() => SkillRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skillId' })
  skill: SkillRecord;
}
