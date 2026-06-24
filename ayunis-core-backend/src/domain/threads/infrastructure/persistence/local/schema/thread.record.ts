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
import { ThreadSourceAssignmentRecord } from './thread-source-assignment.record';
import { ThreadKnowledgeBaseAssignmentRecord } from './thread-knowledge-base-assignment.record';
import { McpIntegrationRecord } from '../../../../../mcp/infrastructure/persistence/postgres/schema/mcp-integration.record';

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
  title?: string;

  @Column({ default: false })
  isAnonymous: boolean;

  /**
   * Timestamp of the most recent conversation activity (last message added).
   * Drives admin-defined data-retention deletion, which keys off inactivity
   * rather than creation date. Distinct from `updatedAt`, which is bumped by
   * any row write (rename, model change) and would let incidental edits
   * silently extend retention. Nullable for backfill safety; the mapper always
   * sets it and retention queries COALESCE to `createdAt` defensively.
   */
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  lastActivityAt?: Date;

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

  @OneToMany(
    () => ThreadKnowledgeBaseAssignmentRecord,
    (assignment) => assignment.thread,
    {
      cascade: true,
    },
  )
  knowledgeBaseAssignments?: ThreadKnowledgeBaseAssignmentRecord[];
}
