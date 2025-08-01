import { UUID } from 'crypto';
import { MessageRecord } from '../../../../../messages/infrastructure/persistence/local/schema/message.record';
import { Column, Entity, OneToMany, Index, ManyToOne } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { PermittedModelRecord } from '../../../../../models/infrastructure/persistence/local-permitted-models/schema/permitted-model.record';
import { AgentRecord } from '../../../../../agents/infrastructure/persistence/local/schema/agent.record';
import { ThreadSourceAssignmentRecord } from './thread-source-assignment.record';

@Entity({ name: 'threads' })
export class ThreadRecord extends BaseRecord {
  @Column()
  @Index()
  userId: UUID;

  @Column({ nullable: true })
  @Index()
  modelId?: UUID;

  @ManyToOne(() => PermittedModelRecord)
  model?: PermittedModelRecord;

  @Column({ nullable: true })
  @Index()
  agentId?: UUID;

  @ManyToOne(() => AgentRecord)
  agent?: AgentRecord;

  @Column({ nullable: true })
  title?: string;

  @OneToMany(() => MessageRecord, (message) => message.thread)
  messages: MessageRecord[];

  @OneToMany(
    () => ThreadSourceAssignmentRecord,
    (assignment) => assignment.thread,
    {
      cascade: true,
    },
  )
  sourceAssignments?: ThreadSourceAssignmentRecord[];
}
