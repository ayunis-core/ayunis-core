import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UUID } from 'crypto';
import { AgentRecord } from './agent.record';
import { ToolConfigRecord } from '../../../../../tools/infrastructure/persistence/local/schema/tool-config.record';
import { ToolType } from '../../../../../tools/domain/value-objects/tool-type.enum';
import { BaseRecord } from '../../../../../../common/db/base-record';

@Entity({ name: 'agent_tools' })
export class AgentToolAssignmentRecord extends BaseRecord {
  @Column()
  @Index()
  agentId: UUID;

  @ManyToOne(() => AgentRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: AgentRecord;

  @Column({ type: 'enum', enum: ToolType })
  @Index()
  toolType: ToolType;

  // For contextual tools, this will be null
  // For configurable tools, this will reference the tool config
  @Column({ nullable: true })
  toolConfigId: UUID | null;

  @ManyToOne(() => ToolConfigRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toolConfigId' })
  toolConfig: ToolConfigRecord | null;
}
