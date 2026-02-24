import { UUID } from 'crypto';
import { MessageRecord } from '../../../../../messages/infrastructure/persistence/local/schema/message.record';
import {
  Column,
  Entity,
  OneToMany,
  Index,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { PermittedModelRecord } from '../../../../../models/infrastructure/persistence/local-permitted-models/schema/permitted-model.record';
import { AgentRecord } from '../../../../../agents/infrastructure/persistence/local/schema/agent.record';
import { ThreadSourceAssignmentRecord } from './thread-source-assignment.record';
import { McpIntegrationRecord } from '../../../../../mcp/infrastructure/persistence/postgres/schema/mcp-integration.record';
import { KnowledgeBaseRecord } from '../../../../../knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';

@Entity({ name: 'threads' })
export class ThreadRecord extends BaseRecord {
  @Column()
  @Index()
  userId: UUID;

  @Column({ nullable: true })
  @Index()
  modelId?: UUID;

  @ManyToOne(() => PermittedModelRecord, { onDelete: 'SET NULL' })
  model?: PermittedModelRecord;

  @Column({ nullable: true })
  @Index()
  agentId?: UUID;

  @ManyToOne(() => AgentRecord, { onDelete: 'SET NULL' })
  agent?: AgentRecord;

  @Column({ nullable: true })
  title?: string;

  @Column({ default: false })
  isAnonymous: boolean;

  @OneToMany(() => MessageRecord, (message) => message.thread)
  messages?: MessageRecord[];

  @OneToMany(
    () => ThreadSourceAssignmentRecord,
    (assignment) => assignment.thread,
    {
      cascade: true,
    },
  )
  sourceAssignments?: ThreadSourceAssignmentRecord[];

  @ManyToMany(() => McpIntegrationRecord)
  @JoinTable({ name: 'thread_mcp_integrations' })
  mcpIntegrations?: McpIntegrationRecord[];

  @ManyToMany(() => KnowledgeBaseRecord)
  @JoinTable({ name: 'thread_knowledge_bases' })
  knowledgeBases?: KnowledgeBaseRecord[];
}
