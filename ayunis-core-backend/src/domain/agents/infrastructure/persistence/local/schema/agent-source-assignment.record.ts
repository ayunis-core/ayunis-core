import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UUID } from 'crypto';
import { AgentRecord } from './agent.record';
import { SourceRecord } from '../../../../../sources/infrastructure/persistence/local/schema/source.record';
import { BaseRecord } from '../../../../../../common/db/base-record';

@Entity({ name: 'agent_source_assignments' })
export class AgentSourceAssignmentRecord extends BaseRecord {
  @Column()
  @Index()
  agentId: UUID;

  @ManyToOne(() => AgentRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: AgentRecord;

  @Column()
  @Index()
  sourceId: UUID;

  @ManyToOne(() => SourceRecord, {
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn({ name: 'sourceId' })
  source: SourceRecord;
}
