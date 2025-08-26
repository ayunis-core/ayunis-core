import { Injectable, Logger } from '@nestjs/common';
import { RemoveSourceFromAgentCommand } from './remove-source-from-agent.command';
import { AgentRepository } from '../../ports/agent.repository';
import { Agent } from '../../../domain/agent.entity';
import { AgentSourceNotFoundError } from '../../agents.errors';

@Injectable()
export class RemoveSourceFromAgentUseCase {
  private readonly logger = new Logger(RemoveSourceFromAgentUseCase.name);

  constructor(private readonly agentRepository: AgentRepository) {}

  async execute(command: RemoveSourceFromAgentCommand): Promise<Agent> {
    this.logger.log('execute', {
      agentId: command.agent.id,
      sourceId: command.sourceId,
    });

    // Check if the source assignment exists
    const existingAssignment = command.agent.sourceAssignments.find(
      (assignment) => assignment.source.id === command.sourceId,
    );

    if (!existingAssignment) {
      throw new AgentSourceNotFoundError(command.sourceId, command.agent.id);
    }

    // Filter out the source assignment to remove
    const updatedSourceAssignments = command.agent.sourceAssignments.filter(
      (assignment) => assignment.source.id !== command.sourceId,
    );

    // Create updated agent without the source assignment
    const updatedAgent = new Agent({
      ...command.agent,
      sourceAssignments: updatedSourceAssignments,
    });

    // Save the updated agent
    const savedAgent = await this.agentRepository.update(updatedAgent);

    this.logger.debug('Source removed from agent successfully', {
      agentId: savedAgent.id,
      sourceId: command.sourceId,
    });

    return savedAgent;
  }
}