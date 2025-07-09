import { Injectable, Logger } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { DeleteAgentCommand } from './delete-agent.command';
import { AgentNotFoundError } from '../../agents.errors';
import { ReplaceModelWithUserDefaultUseCase } from 'src/domain/threads/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.use-case';
import { ReplaceModelWithUserDefaultCommand } from 'src/domain/threads/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.command';

@Injectable()
export class DeleteAgentUseCase {
  private readonly logger = new Logger(DeleteAgentUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly replaceModelWithUserDefaultUseCase: ReplaceModelWithUserDefaultUseCase,
  ) {}

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

    await this.replaceModelWithUserDefaultUseCase.execute(
      new ReplaceModelWithUserDefaultCommand({
        oldAgentId: command.agentId,
      }),
    );

    // Delete the agent
    await this.agentRepository.delete(command.agentId, command.userId);
  }
}
