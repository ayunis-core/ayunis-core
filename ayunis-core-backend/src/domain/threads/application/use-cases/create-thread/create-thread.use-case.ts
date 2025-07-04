import { Injectable, Logger, Inject } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { CreateThreadCommand } from './create-thread.command';
import { ThreadCreationError, ThreadError } from '../../threads.errors';
import { GetPermittedModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-model/get-permitted-model.use-case';
import { GetPermittedModelByIdQuery } from 'src/domain/models/application/use-cases/get-permitted-model/get-permitted-model.query';
import { ModelError } from 'src/domain/models/application/models.errors';
import { GetAvailableModelUseCase } from 'src/domain/models/application/use-cases/get-available-model/get-available-model.use-case';
import { GetAvailableModelQuery } from 'src/domain/models/application/use-cases/get-available-model/get-available-model.query';

@Injectable()
export class CreateThreadUseCase {
  private readonly logger = new Logger(CreateThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly getPermittedModelUseCase: GetPermittedModelUseCase,
    private readonly getAvailableModelUseCase: GetAvailableModelUseCase,
  ) {}

  async execute(command: CreateThreadCommand): Promise<Thread> {
    this.logger.log('execute', { userId: command.userId });
    try {
      const model = await this.getPermittedModelUseCase.execute(
        new GetPermittedModelByIdQuery({
          modelId: command.modelId,
          orgId: command.orgId,
        }),
      );
      try {
        const thread = new Thread({
          userId: command.userId,
          model: model,
          messages: [],
        });
        const createdThread = await this.threadsRepository.create(thread);
        const { config } = this.getAvailableModelUseCase.execute(
          new GetAvailableModelQuery(model.model.id),
        );
        return new Thread({
          ...createdThread,
          modelConfig: config,
        });
      } catch (error) {
        this.logger.error('Failed to create thread', {
          userId: command.userId,
          error,
        });
        throw new ThreadCreationError(error, command.userId);
      }
    } catch (error) {
      if (error instanceof ModelError || error instanceof ThreadError) {
        throw error;
      }
      this.logger.error('Failed to create thread', {
        userId: command.userId,
        error,
      });
      throw error instanceof Error
        ? new ThreadCreationError(error, command.userId)
        : new ThreadCreationError(new Error('Unknown error'), command.userId);
    }
  }
}
