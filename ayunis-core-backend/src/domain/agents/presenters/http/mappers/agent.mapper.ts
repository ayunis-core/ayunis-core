import { Injectable } from '@nestjs/common';
import { Agent } from '../../../domain/agent.entity';
import { AgentResponseDto } from '../dto/agent-response.dto';
import { SourceDtoMapper } from '../../../threads/presenters/http/mappers/source.mapper';

@Injectable()
export class AgentDtoMapper {
  constructor(private readonly sourceDtoMapper: SourceDtoMapper) {}

  toDto(agent: Agent): AgentResponseDto {
    return {
      id: agent.id,
      name: agent.name,
      instructions: agent.instructions,
      userId: agent.userId,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      model: {
        id: agent.model.id,
        name: agent.model.model.name,
        provider: agent.model.model.provider,
        displayName: agent.model.model.displayName,
      },
      tools: agent.tools.map((tool) => ({
        type: tool.type,
        configId: undefined, // Simplified for now
      })),
      sources: agent.sourceAssignments.map((assignment) =>
        this.sourceDtoMapper.toDto(assignment.source, agent.id),
      ),
    };
  }

  toDtoArray(agents: Agent[]): AgentResponseDto[] {
    return agents.map((agent) => this.toDto(agent));
  }
}
