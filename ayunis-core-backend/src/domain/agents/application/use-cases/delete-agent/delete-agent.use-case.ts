import { Injectable, Logger } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { DeleteAgentCommand } from './delete-agent.command';
import { AgentNotFoundError, UnexpectedAgentError } from '../../agents.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Transactional } from '@nestjs-cls/transactional';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class DeleteAgentUseCase {
  private readonly logger = new Logger(DeleteAgentUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly contextService: ContextService,
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

      // Note: Threads that used this agent will show a "conversation no longer
      // accessible" disclaimer when the user tries to continue the chat.
      // The history is preserved.

      // Delete the agent
      await this.agentRepository.delete(command.agentId, userId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error deleting agent', error);
      throw new UnexpectedAgentError(error as Error);
    }
  }
}
