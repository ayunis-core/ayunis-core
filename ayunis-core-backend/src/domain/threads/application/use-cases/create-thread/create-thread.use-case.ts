import { Injectable, Logger } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { CreateThreadCommand } from './create-thread.command';
import {
  NoModelOrAgentProvidedError,
  ThreadCreationError,
  ThreadError,
} from '../../threads.errors';
import { GetPermittedModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-model/get-permitted-model.use-case';
import { ModelError } from 'src/domain/models/application/models.errors';
import { GetPermittedModelQuery } from 'src/domain/models/application/use-cases/get-permitted-model/get-permitted-model.query';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { Agent } from 'src/domain/agents/domain/agent.entity';
import { GetAgentUseCase } from 'src/domain/agents/application/use-cases/get-agent/get-agent.use-case';
import { GetAgentQuery } from 'src/domain/agents/application/use-cases/get-agent/get-agent.query';

@Injectable()
export class CreateThreadUseCase {
  private readonly logger = new Logger(CreateThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly getPermittedModelUseCase: GetPermittedModelUseCase,
    private readonly getAgentUseCase: GetAgentUseCase,
  ) {}

  async execute(command: CreateThreadCommand): Promise<Thread> {
    this.logger.log('execute', { userId: command.userId });
    try {
      let model: PermittedModel | undefined;
      let agent: Agent | undefined;

      if (command.modelId) {
        model = await this.getPermittedModelUseCase.execute(
          new GetPermittedModelQuery({
            permittedModelId: command.modelId,
            orgId: command.orgId,
          }),
        );
      }

      if (command.agentId) {
        agent = await this.getAgentUseCase.execute(
          new GetAgentQuery({
            id: command.agentId,
            userId: command.userId,
          }),
        );
      }
      if (!model && !agent) {
        throw new NoModelOrAgentProvidedError(command.userId);
      }

      try {
        const thread = new Thread({
          userId: command.userId,
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
          userId: command.userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new ThreadCreationError(error as Error, command.userId);
      }
    } catch (error) {
      if (error instanceof ModelError || error instanceof ThreadError) {
        throw error;
      }
      this.logger.error('Failed to create thread', {
        userId: command.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error instanceof Error
        ? new ThreadCreationError(error, command.userId)
        : new ThreadCreationError(new Error('Unknown error'), command.userId);
    }
  }
}
