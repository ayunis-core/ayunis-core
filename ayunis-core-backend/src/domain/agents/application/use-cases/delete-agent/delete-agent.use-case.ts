import { Injectable, Logger } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { DeleteAgentCommand } from './delete-agent.command';
import { AgentNotFoundError, UnexpectedAgentError } from '../../agents.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ReplaceAgentWithDefaultModelUseCase } from 'src/domain/threads/application/use-cases/replace-agent-with-default-model/replace-agent-with-default-model.use-case';
import { ReplaceAgentWithDefaultModelCommand } from 'src/domain/threads/application/use-cases/replace-agent-with-default-model/replace-agent-with-default-model.command';
import { Transactional } from '@nestjs-cls/transactional';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class DeleteAgentUseCase {
  private readonly logger = new Logger(DeleteAgentUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly contextService: ContextService,
    private readonly replaceAgentWithDefaultModel: ReplaceAgentWithDefaultModelUseCase,
  ) {}

  @Transactional()
  async execute(command: DeleteAgentCommand): Promise<void> {
    this.logger.log('execute', command);
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      // Check if agent exists before trying to delete
      const agent = await this.agentRepository.findOne(command.agentId, userId);
      if (!agent) {
        throw new AgentNotFoundError(command.agentId);
      }

      // Replace agent in threads BEFORE deletion (while threads still reference this agentId)
      await this.replaceAgentWithDefaultModel.execute(
        new ReplaceAgentWithDefaultModelCommand({
          oldAgentId: command.agentId,
        }),
      );

      // Delete the agent
      await this.agentRepository.delete(command.agentId, userId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error deleting agent', error);
      throw new UnexpectedAgentError(error as Error);
    }
  }
}
