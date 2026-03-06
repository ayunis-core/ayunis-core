import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UUID } from 'crypto';
import { ThreadRecord } from './thread.record';
import { KnowledgeBaseRecord } from '../../../../../knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { BaseRecord } from '../../../../../../common/db/base-record';

@Entity({ name: 'thread_knowledge_base_assignments' })
export class ThreadKnowledgeBaseAssignmentRecord extends BaseRecord {
  @Column()
  @Index()
  threadId: UUID;

  @ManyToOne(() => ThreadRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'threadId' })
  thread: ThreadRecord;

  @Column()
  @Index()
  knowledgeBaseId: UUID;

  @ManyToOne(() => KnowledgeBaseRecord, {
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn({ name: 'knowledgeBaseId' })
  knowledgeBase: KnowledgeBaseRecord;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  originSkillId: UUID | null;
}
