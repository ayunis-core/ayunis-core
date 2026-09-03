import { Injectable, Logger } from '@nestjs/common';
import { ReplaceModelWithUserDefaultCommand } from './replace-model-with-user-default.command';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { ModelReplacementError } from 'src/domain/threads/application/threads.errors';
import { Thread } from 'src/domain/threads/domain/thread.entity';

@Injectable()
export class ReplaceModelWithUserDefaultUseCase {
  private readonly logger = new Logger(ReplaceModelWithUserDefaultUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
  ) {}

  async execute(command: ReplaceModelWithUserDefaultCommand): Promise<void> {
    this.logger.debug(
      {
        orgId: command.orgId,
        oldPermittedModelId: command.oldPermittedModelId,
        catalogModelId: command.catalogModelId,
      },
      'execute',
    );
    try {
      const threads: Thread[] = await this.threadsRepository.findAllByModel(
        command.oldPermittedModelId,
      );
      this.logger.debug({ threadCount: threads.length }, 'Found threads');
      for (const thread of threads) {
        await this.replaceThreadModel(thread, command);
      }
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Error replacing model with user default',
      );
      throw error;
    }
  }

  private async replaceThreadModel(
    thread: Thread,
    command: ReplaceModelWithUserDefaultCommand,
  ): Promise<void> {
    const defaultModel = await this.getDefaultModelUseCase.execute(
      new GetDefaultModelQuery({
        orgId: command.orgId,
        userId: thread.userId,
        blacklistedModelIds: command.catalogModelId
          ? [command.catalogModelId]
          : [],
      }),
    );
    this.logger.debug(
      {
        newModelId: defaultModel.id,
        oldPermittedModelId: command.oldPermittedModelId,
      },
      'Found default model',
    );
    if (defaultModel.id === command.oldPermittedModelId) {
      throw new ModelReplacementError(thread.id, command.oldPermittedModelId);
    }
    this.logger.debug(
      { threadId: thread.id, newModelId: defaultModel.id },
      'Updating thread',
    );
    await this.threadsRepository.updateModel({
      threadId: thread.id,
      userId: thread.userId,
      permittedModelId: defaultModel.id,
    });
  }
}
