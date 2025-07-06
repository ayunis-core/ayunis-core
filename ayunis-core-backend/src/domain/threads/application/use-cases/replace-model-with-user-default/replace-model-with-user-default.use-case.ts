import { Injectable, Logger } from '@nestjs/common';
import { ReplaceModelWithUserDefaultCommand } from './replace-model-with-user-default.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { ModelReplacementError } from '../../threads.errors';

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
      const threads = await this.threadsRepository.findAllByModel(
        command.oldPermittedModelId,
      );
      this.logger.debug('Found threads', {
        threads,
      });
      // TODO: Make this a single transaction
      for await (const thread of threads) {
        const defaultModel = await this.getDefaultModelUseCase.execute(
          new GetDefaultModelQuery({
            orgId: thread.model.orgId,
            userId: thread.userId,
            blacklistedModelIds: [command.oldPermittedModelId],
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

        await this.threadsRepository.updateModel(
          thread.id,
          thread.userId,
          defaultModel,
        );
      }
    } catch (error) {
      this.logger.error('Error replacing model with user default', {
        error,
      });
      throw error;
    }
  }
}
