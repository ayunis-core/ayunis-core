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
import { KnowledgeBaseRecord } from './knowledge-base.record';

@Entity({ name: 'workspace_knowledge_base_links' })
@Index(
  'UQ_workspace_knowledge_base_links_workspace_knowledge_base',
  ['workspaceId', 'knowledgeBaseId'],
  { unique: true },
)
export class WorkspaceKnowledgeBaseLinkRecord {
  @PrimaryColumn('uuid')
  id: UUID;

  @Column({ nullable: false })
  workspaceId: UUID;

  @ManyToOne(() => WorkspaceRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord;

  @Index()
  @Column({ nullable: false })
  knowledgeBaseId: UUID;

  @ManyToOne(() => KnowledgeBaseRecord, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'knowledgeBaseId' })
  knowledgeBase: KnowledgeBaseRecord;

  @Column({ type: 'varchar', nullable: true })
  linkedByUserId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linkedByUserId' })
  linkedBy: UserRecord | null;

  @CreateDateColumn()
  createdAt: Date;
}
