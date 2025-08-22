import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { CreateThreadCommand } from './create-thread.command';
import {
  NoModelOrAgentProvidedError,
  ThreadCreationError,
  ThreadError,
} from '../../threads.errors';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { ModelError } from 'src/domain/models/application/models.errors';
import { GetPermittedLanguageModelQuery } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.query';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { Agent } from 'src/domain/agents/domain/agent.entity';
import { GetAgentUseCase } from 'src/domain/agents/application/use-cases/get-agent/get-agent.use-case';
import { GetAgentQuery } from 'src/domain/agents/application/use-cases/get-agent/get-agent.query';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class CreateThreadUseCase {
  private readonly logger = new Logger(CreateThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly getPermittedLanguageModelUseCase: GetPermittedLanguageModelUseCase,
    private readonly getAgentUseCase: GetAgentUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: CreateThreadCommand): Promise<Thread> {
    this.logger.log('execute');
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }
      let model: PermittedLanguageModel | undefined;
      let agent: Agent | undefined;

      if (command.modelId) {
        model = await this.getPermittedLanguageModelUseCase.execute(
          new GetPermittedLanguageModelQuery({
            id: command.modelId,
          }),
        );
      }

      if (command.agentId) {
        agent = await this.getAgentUseCase.execute(
          new GetAgentQuery({
            id: command.agentId,
          }),
        );
      }
      if (!model && !agent) {
        throw new NoModelOrAgentProvidedError(userId);
      }

      try {
        const thread = new Thread({
          userId,
          model: model,
          agent: agent,
          messages: [],
        });
        const createdThread = await this.threadsRepository.create(thread);
        return new Thread({
          ...createdThread,
        });
      } catch (error) {
        this.logger.error('Failed to create thread', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new ThreadCreationError(error as Error, userId);
      }
    } catch (error) {
      if (error instanceof ModelError || error instanceof ThreadError) {
        throw error;
      }
      this.logger.error('Failed to create thread', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error instanceof Error
        ? new ThreadCreationError(error)
        : new ThreadCreationError(new Error('Unknown error'));
    }
  }
}
