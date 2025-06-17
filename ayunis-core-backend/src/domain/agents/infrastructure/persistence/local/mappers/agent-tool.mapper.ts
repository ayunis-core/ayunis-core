import { AgentToolAssignmentRecord } from '../schema/agent-tool.record';
import { AgentToolAssignment } from '../../../../domain/value-objects/agent-tool-assignment.object';
import { UUID } from 'crypto';

export class AgentToolMapper {
  static toDomain(entity: AgentToolAssignmentRecord): AgentToolAssignment {
    return new AgentToolAssignment({
      toolType: entity.toolType,
      toolConfigId: entity.toolConfigId,
    });
  }

  static toEntity(
    agentId: UUID,
    assignment: AgentToolAssignment,
  ): AgentToolAssignmentRecord {
    const entity = new AgentToolAssignmentRecord();
    entity.agentId = agentId;
    entity.toolType = assignment.toolType;
    entity.toolConfigId = assignment.toolConfigId;
    return entity;
  }

  static toDomainArray(
    entities: AgentToolAssignmentRecord[],
  ): AgentToolAssignment[] {
    return entities.map((entity) => this.toDomain(entity));
  }
}
