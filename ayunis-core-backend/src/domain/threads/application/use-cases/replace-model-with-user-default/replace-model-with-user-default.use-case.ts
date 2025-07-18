import { Injectable, Logger } from '@nestjs/common';
import { ReplaceModelWithUserDefaultCommand } from './replace-model-with-user-default.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { ModelReplacementError } from '../../threads.errors';
import { Thread } from 'src/domain/threads/domain/thread.entity';

@Injectable()
export class ReplaceModelWithUserDefaultUseCase {
  private readonly logger = new Logger(ReplaceModelWithUserDefaultUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
  ) {}

  async execute(command: ReplaceModelWithUserDefaultCommand): Promise<void> {
    this.logger.debug('Replacing model with user default', {
      command,
    });
    try {
      let threads: Thread[] = [];
      if (command.oldPermittedModelId) {
        threads = await this.threadsRepository.findAllByModel(
          command.oldPermittedModelId,
        );
      } else if (command.oldAgentId) {
        threads = await this.threadsRepository.findAllByAgent(
          command.oldAgentId,
        );
      }
      this.logger.debug('Found threads', {
        threads,
      });
      // TODO: Make this a single transaction
      for (const thread of threads) {
        if (!thread.model) {
          continue;
        }
        const defaultModel = await this.getDefaultModelUseCase.execute(
          new GetDefaultModelQuery({
            orgId: thread.model.orgId,
            userId: thread.userId,
            blacklistedModelIds: command.oldPermittedModelId
              ? [command.oldPermittedModelId]
              : [],
          }),
        );
        this.logger.debug('Found default model', {
          defaultModel,
          oldPermittedModelId: command.oldPermittedModelId,
        });
        if (defaultModel.id === command.oldPermittedModelId) {
          throw new ModelReplacementError(
            thread.id,
            command.oldPermittedModelId,
          );
        }

        this.logger.debug('Updating thread', {
          threadId: thread.id,
          newModelId: defaultModel.id,
        });
        await this.threadsRepository.updateModel({
          threadId: thread.id,
          userId: thread.userId,
          permittedModelId: defaultModel.id,
        });
      }
    } catch (error) {
      this.logger.error('Error replacing model with user default', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
