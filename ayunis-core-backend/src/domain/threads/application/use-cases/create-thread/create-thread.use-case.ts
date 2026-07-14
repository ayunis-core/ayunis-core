import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Thread } from '../../../domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { CreateThreadCommand } from './create-thread.command';
import {
  NoModelProvidedError,
  ThreadCreationError,
  ThreadError,
  UnexpectedThreadError,
} from '../../threads.errors';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { ModelError } from 'src/domain/models/application/models.errors';
import { GetPermittedLanguageModelQuery } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.query';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class CreateThreadUseCase {
  private readonly logger = new Logger(CreateThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly getPermittedLanguageModelUseCase: GetPermittedLanguageModelUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedThreadError)
  async execute(command: CreateThreadCommand): Promise<Thread> {
    this.logger.log('execute');
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }
      const model = await this.resolveModel(command, userId);
      const isAnonymous = model.anonymousOnly || (command.isAnonymous ?? false);
      return await this.persistThread(userId, model, isAnonymous);
    } catch (error) {
      throw this.translateError(error);
    }
  }

  private async resolveModel(
    command: CreateThreadCommand,
    userId: UUID,
  ): Promise<PermittedLanguageModel> {
    let model: PermittedLanguageModel | undefined;

    if (command.modelId) {
      model = await this.getPermittedLanguageModelUseCase.execute(
        new GetPermittedLanguageModelQuery({
          id: command.modelId,
        }),
      );
    }

    if (!model) {
      throw new NoModelProvidedError(userId);
    }

    return model;
  }

  private async persistThread(
    userId: UUID,
    model: PermittedLanguageModel,
    isAnonymous: boolean,
  ): Promise<Thread> {
    try {
      const thread = new Thread({
        userId,
        model,
        isAnonymous,
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
  }

  private translateError(error: unknown): Error {
    if (error instanceof ModelError || error instanceof ThreadError) {
      return error;
    }
    this.logger.error('Failed to create thread', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return error instanceof Error
      ? new ThreadCreationError(error)
      : new ThreadCreationError(new Error('Unknown error'));
  }
}
