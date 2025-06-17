import { Injectable, Logger } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { DeleteAgentCommand } from './delete-agent.command';
import { AgentNotFoundError } from '../../agents.errors';

@Injectable()
export class DeleteAgentUseCase {
  private readonly logger = new Logger(DeleteAgentUseCase.name);

  constructor(private readonly agentRepository: AgentRepository) {}

  async execute(command: DeleteAgentCommand): Promise<void> {
    this.logger.log('execute', command);

    // Check if agent exists before trying to delete
    const agent = await this.agentRepository.findOne(
      command.agentId,
      command.userId,
    );
    if (!agent) {
      throw new AgentNotFoundError(command.agentId);
    }

    // Delete the agent
    await this.agentRepository.delete(command.agentId, command.userId);
  }
}
