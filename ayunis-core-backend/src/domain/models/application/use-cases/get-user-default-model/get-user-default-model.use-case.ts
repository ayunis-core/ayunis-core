import { Injectable, Logger } from '@nestjs/common';
import { GetUserDefaultModelQuery } from './get-user-default-model.query';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { UserDefaultModelsRepository } from 'src/domain/models/application/ports/user-default-models.repository';
import { ModelError } from 'src/domain/models/application/models.errors';

@Injectable()
export class GetUserDefaultModelUseCase {
  private readonly logger = new Logger(GetUserDefaultModelUseCase.name);

  constructor(
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
  ) {}

  async execute(
    query: GetUserDefaultModelQuery,
  ): Promise<PermittedLanguageModel | null> {
    this.logger.log(
      {
        userId: query.userId,
      },
      'execute',
    );

    try {
      const userDefaultModel =
        await this.userDefaultModelsRepository.findByUserId(query.userId);

      if (userDefaultModel) {
        this.logger.debug(
          {
            userId: query.userId,
            modelId: userDefaultModel.id,
            modelName: userDefaultModel.model.name,
            modelProvider: userDefaultModel.model.provider,
          },
          'User default model found',
        );
      } else {
        this.logger.debug(
          {
            userId: query.userId,
          },
          'No user default model found',
        );
      }

      return userDefaultModel;
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }
      this.logger.error(
        {
          userId: query.userId,
          err: error instanceof Error ? error : new Error('Unknown error'),
        },
        'Failed to get user default model',
      );
      throw error;
    }
  }
}
