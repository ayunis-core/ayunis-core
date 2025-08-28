import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { AddSourceToAgentCommand } from './add-source-to-agent.command';
import { ContextService } from 'src/common/context/services/context.service';
import {
  AgentNotFoundError,
  SourceAlreadyAssignedError,
  UnexpectedAgentError,
} from '../../agents.errors';
import { AgentSourceAssignment } from 'src/domain/agents/domain/agent-source-assignment.entity';
import { Agent } from 'src/domain/agents/domain/agent.entity';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class AddSourceToAgentUseCase {
  private readonly logger = new Logger(AddSourceToAgentUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: AddSourceToAgentCommand,
  ): Promise<AgentSourceAssignment> {
    this.logger.log('addSource', {
      agentId: command.agentId,
      sourceId: command.source.id,
    });
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const agent = await this.agentRepository.findOne(command.agentId, userId);

      if (!agent) {
        throw new AgentNotFoundError(command.agentId);
      }

      const currentSourceAssignments = agent.sourceAssignments ?? [];
      if (
        currentSourceAssignments.some(
          (assignment) => assignment.source.id === command.source.id,
        )
      ) {
        throw new SourceAlreadyAssignedError(command.source.id);
      }
      const newSourceAssignment = new AgentSourceAssignment({
        source: command.source,
      });
      const newSourceAssignments = [
        ...currentSourceAssignments,
        newSourceAssignment,
      ];

      const updatedAgent = new Agent({
        ...agent,
        sourceAssignments: newSourceAssignments,
      });

      await this.agentRepository.update(updatedAgent);
      return newSourceAssignment;
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Error adding source to agent', {
        error: error as Error,
      });
      throw new UnexpectedAgentError('Error adding source to agent', {
        error: error as Error,
      });
    }
  }
}
