import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UUID } from 'crypto';
import { AgentToolAssignmentRecord } from './agent-tool.record';
import { AgentSourceAssignmentRecord } from './agent-source-assignment.record';
import { PermittedModelRecord } from '../../../../../models/infrastructure/persistence/local-permitted-models/schema/permitted-model.record';
import { UserRecord } from '../../../../../../iam/users/infrastructure/repositories/local/schema/user.record';
import { User } from '../../../../../../iam/users/domain/user.entity';

@Entity({ name: 'agents' })
export class AgentRecord extends BaseRecord {
  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  instructions: string;

  @Column({ nullable: false })
  modelId: UUID;

  @ManyToOne(() => PermittedModelRecord, { nullable: false, eager: true })
  model: PermittedModelRecord;

  @Column({ nullable: false })
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  user: User;

  @OneToMany(() => AgentToolAssignmentRecord, (agentTool) => agentTool.agent, {
    cascade: true,
  })
  agentTools?: AgentToolAssignmentRecord[];

  @OneToMany(() => AgentSourceAssignmentRecord, (agentSource) => agentSource.agent, {
    cascade: true,
  })
  agentSources?: AgentSourceAssignmentRecord[];
}
