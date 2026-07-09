import { Injectable } from '@nestjs/common';
import { BaseUseCase } from 'src/common/use-case/base-use-case';
import { GetUserDefaultModelQuery } from './get-user-default-model.query';
import { PermittedLanguageModel } from '../../../domain/permitted-model.entity';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { ModelError } from '../../models.errors';

@Injectable()
export class GetUserDefaultModelUseCase extends BaseUseCase {
  constructor(
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
  ) {
    super();
  }

  async execute(
    query: GetUserDefaultModelQuery,
  ): Promise<PermittedLanguageModel | null> {
    this.logger.log('execute', {
      userId: query.userId,
    });

    try {
      const userDefaultModel =
        await this.userDefaultModelsRepository.findByUserId(query.userId);

      if (userDefaultModel) {
        this.logger.debug('User default model found', {
          userId: query.userId,
          modelId: userDefaultModel.id,
          modelName: userDefaultModel.model.name,
          modelProvider: userDefaultModel.model.provider,
        });
      } else {
        this.logger.debug('No user default model found', {
          userId: query.userId,
        });
      }

      return userDefaultModel;
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }
      this.logger.error('Failed to get user default model', {
        userId: query.userId,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw error;
    }
  }
}
