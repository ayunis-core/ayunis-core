import { Injectable } from '@nestjs/common';
import { AgentSourceAssignment } from '../../../domain/agent-source-assignment.entity';
import { AgentSourceResponseDto } from '../dto/agent-source-assignment-response.dto';

@Injectable()
export class AgentSourceDtoMapper {
  toDto(assignment: AgentSourceAssignment): AgentSourceResponseDto {
    const source = assignment.source;
    return {
      id: assignment.id,
      sourceId: source.id,
      name: source.name,
      type: source.type,
    };
  }

  toDtoArray(assignments: AgentSourceAssignment[]): AgentSourceResponseDto[] {
    return assignments.map((assignment) => this.toDto(assignment));
  }
}
