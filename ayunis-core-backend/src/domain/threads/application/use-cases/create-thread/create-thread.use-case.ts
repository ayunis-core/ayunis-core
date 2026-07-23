import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { CreateThreadCommand } from './create-thread.command';
import {
  NoModelProvidedError,
  ThreadCreationError,
  UnexpecteThreadError,
} from '../../threads.errors';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { GetPermittedLanguageModelQuery } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.query';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

@Injectable()
export class CreateThreadUseCase {
  private readonly logger = new Logger(CreateThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly getPermittedLanguageModelUseCase: GetPermittedLanguageModelUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(command: CreateThreadCommand): Promise<Thread> {
    this.logger.log('execute');
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const model = await this.resolveModel(command, userId);
    const isAnonymous = model.anonymousOnly || (command.isAnonymous ?? false);

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

  private async resolveModel(
    command: CreateThreadCommand,
    userId: string,
  ): Promise<PermittedLanguageModel> {
    if (!command.modelId) {
      throw new NoModelProvidedError(userId);
    }
    return this.getPermittedLanguageModelUseCase.execute(
      new GetPermittedLanguageModelQuery({
        id: command.modelId,
      }),
    );
  }
}
