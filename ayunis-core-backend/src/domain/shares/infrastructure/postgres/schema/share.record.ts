import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  TableInheritance,
  ChildEntity,
} from 'typeorm';
import { BaseRecord } from '../../../../../common/db/base-record';
import { SharedEntityType } from '../../../../../domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeRecord } from './share-scope.record';
import { AgentRecord } from '../../../../../domain/agents/infrastructure/persistence/local/schema/agent.record';
import { UUID } from 'crypto';

@Entity('shares')
@TableInheritance({ column: { type: 'varchar', name: 'entity_type' } })
export class ShareRecord extends BaseRecord {
  @ManyToOne(() => ShareScopeRecord, {
    eager: true,
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scope_id' })
  scope: ShareScopeRecord;

  @Column({ name: 'owner_id' })
  ownerId: UUID;
}

@ChildEntity(SharedEntityType.AGENT)
export class AgentShareRecord extends ShareRecord {
  @Column({ name: 'agent_id' })
  agentId: UUID;

  @ManyToOne(() => AgentRecord, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'agent_id' })
  agent: AgentRecord;
}
