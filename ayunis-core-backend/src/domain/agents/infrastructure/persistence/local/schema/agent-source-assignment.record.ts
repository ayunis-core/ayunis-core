import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UUID } from 'crypto';
import { AgentRecord } from './agent.record';
import { SourceRecord } from '../../../../../sources/infrastructure/persistence/local/schema/source.record';

@Entity({ name: 'agent_source_assignments' })
export class AgentSourceAssignmentRecord extends BaseRecord {
  @Column({ nullable: false })
  agentId: UUID;

  @ManyToOne(() => AgentRecord, { nullable: false, onDelete: 'CASCADE' })
  agent: AgentRecord;

  @Column({ nullable: false })
  sourceId: UUID;

  @ManyToOne(() => SourceRecord, { nullable: false, eager: true })
  source: SourceRecord;
}