import type { UUID } from 'crypto';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { KnowledgeBaseRecord } from './knowledge-base.record';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';

@Entity('knowledge_base_activations')
@Check(
  'CHK_knowledge_base_activations_exactly_one_scope',
  '("userId" IS NOT NULL AND "workspaceId" IS NULL) OR ("userId" IS NULL AND "workspaceId" IS NOT NULL)',
)
@Index(
  'UQ_knowledge_base_activation_knowledge_base_user',
  ['knowledgeBaseId', 'userId'],
  {
    unique: true,
    where: '"userId" IS NOT NULL',
  },
)
@Index(
  'UQ_knowledge_base_activation_knowledge_base_workspace',
  ['knowledgeBaseId', 'workspaceId'],
  {
    unique: true,
    where: '"workspaceId" IS NOT NULL',
  },
)
export class KnowledgeBaseActivationRecord {
  @PrimaryColumn('uuid')
  id: UUID;

  @Column('uuid')
  knowledgeBaseId: UUID;

  @ManyToOne(() => KnowledgeBaseRecord, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'knowledgeBaseId' })
  knowledgeBase: KnowledgeBaseRecord;

  @Column('uuid', { nullable: true })
  @Index()
  userId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord | null;

  @Column('varchar', { nullable: true })
  workspaceId: UUID | null;

  @ManyToOne(() => WorkspaceRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord | null;

  @CreateDateColumn()
  createdAt: Date;
}
