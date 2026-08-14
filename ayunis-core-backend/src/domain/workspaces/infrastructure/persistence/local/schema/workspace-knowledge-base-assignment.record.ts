import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { WorkspaceRecord } from './workspace.record';

@Entity({ name: 'workspace_knowledge_base_assignments' })
@Unique(['workspaceId', 'knowledgeBaseId'])
export class WorkspaceKnowledgeBaseAssignmentRecord extends BaseRecord {
  @Column()
  @Index()
  workspaceId: UUID;

  @ManyToOne(() => WorkspaceRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord;

  @Column()
  @Index()
  knowledgeBaseId: UUID;

  @ManyToOne(() => KnowledgeBaseRecord, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'knowledgeBaseId' })
  knowledgeBase: KnowledgeBaseRecord;
}
