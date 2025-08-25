import { Injectable, Logger } from '@nestjs/common';
import { AddSourceToAgentCommand } from './add-source-to-agent.command';
import { AgentRepository } from '../../ports/agent.repository';
import { Agent } from '../../../domain/agent.entity';
import { AgentSourceAssignment } from '../../../domain/agent-source-assignment.entity';

@Injectable()
export class AddSourceToAgentUseCase {
  private readonly logger = new Logger(AddSourceToAgentUseCase.name);

  constructor(private readonly agentRepository: AgentRepository) {}

  async execute(command: AddSourceToAgentCommand): Promise<Agent> {
    this.logger.log('execute', {
      agentId: command.agent.id,
      sourceId: command.source.id,
    });

    // Create new source assignment
    const sourceAssignment = new AgentSourceAssignment({
      source: command.source,
    });

    // Create updated agent with new source assignment
    const updatedAgent = new Agent({
      ...command.agent,
      sourceAssignments: [...command.agent.sourceAssignments, sourceAssignment],
    });

    // Save the updated agent
    const savedAgent = await this.agentRepository.update(updatedAgent);

    this.logger.debug('Source added to agent successfully', {
      agentId: savedAgent.id,
      sourceId: command.source.id,
    });

    return savedAgent;
  }
}