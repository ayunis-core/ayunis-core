import {
  Entity,
  Column,
  ManyToOne,
  Unique,
  PrimaryColumn,
  CreateDateColumn,
} from 'typeorm';
import { UUID } from 'crypto';
import { SkillRecord } from './skill.record';
import { UserRecord } from '../../../../../../iam/users/infrastructure/repositories/local/schema/user.record';

@Entity({ name: 'skill_activations' })
@Unique('UQ_skill_activation_skillId_userId', ['skillId', 'userId'])
export class SkillActivationRecord {
  @PrimaryColumn('uuid')
  id: UUID;

  @Column({ nullable: false })
  skillId: UUID;

  @Column({ nullable: false })
  userId: UUID;

  @ManyToOne(() => SkillRecord, { nullable: false, onDelete: 'CASCADE' })
  skill: SkillRecord;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  user: UserRecord;

  @CreateDateColumn()
  createdAt: Date;
}
