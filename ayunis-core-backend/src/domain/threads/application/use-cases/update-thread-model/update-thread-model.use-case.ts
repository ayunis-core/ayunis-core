import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { UpdateThreadModelCommand } from './update-thread-model.command';
import { ThreadNotFoundError, ThreadUpdateError } from '../../threads.errors';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { GetPermittedLanguageModelQuery } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.query';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class UpdateThreadModelUseCase {
  private readonly logger = new Logger(UpdateThreadModelUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly getPermittedLanguageModelUseCase: GetPermittedLanguageModelUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateThreadModelCommand): Promise<void> {
    this.logger.log('updateModel', {
      threadId: command.threadId,
      modelId: command.modelId,
    });

    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }
      const thread = await this.threadsRepository.findOne(
        command.threadId,
        userId,
      );
      if (!thread) {
        throw new ThreadNotFoundError(command.threadId, userId);
      }
      const permittedModel =
        await this.getPermittedLanguageModelUseCase.execute(
          new GetPermittedLanguageModelQuery({
            id: command.modelId,
          }),
        );
      await this.threadsRepository.updateModel({
        threadId: command.threadId,
        userId,
        permittedModelId: permittedModel.id,
      });
    } catch (error) {
      this.logger.error('Failed to update thread model', {
        threadId: command.threadId,
        modelId: command.modelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error instanceof Error
        ? new ThreadUpdateError(command.threadId, error)
        : new ThreadUpdateError(command.threadId, new Error('Unknown error'));
    }
  }
}
