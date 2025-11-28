import { Injectable } from '@nestjs/common';
import { Agent } from '../../../domain/agent.entity';
import { AgentResponseDto } from '../dto/agent-response.dto';
import { AgentSourceDtoMapper } from './agent-source.mapper';

@Injectable()
export class AgentDtoMapper {
  constructor(private readonly agentSourceDtoMapper: AgentSourceDtoMapper) {}

  toDto(agent: Agent, isShared: boolean = false): AgentResponseDto {
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
        anonymousOnly: agent.model.anonymousOnly,
      },
      tools: agent.tools.map((tool) => ({
        type: tool.type,
        configId: undefined, // Simplified for now
      })),
      sources: this.agentSourceDtoMapper.toDtoArray(
        agent.sourceAssignments || [],
      ),
      isShared,
      ownerId: agent.userId,
    };
  }

  toDtoArray(agents: Agent[]): AgentResponseDto[] {
    return agents.map((agent) => this.toDto(agent));
  }
}
