import { Injectable, Logger } from '@nestjs/common';
import { GetDefaultModelQuery } from './get-default-model.query';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { DefaultModelNotFoundError, ModelError } from '../../models.errors';

@Injectable()
export class GetDefaultModelUseCase {
  private readonly logger = new Logger(GetDefaultModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
  ) {}

  async execute(query: GetDefaultModelQuery): Promise<PermittedLanguageModel> {
    this.logger.log('execute', {
      query,
    });

    try {
      // Step 1: Check if user has a specific default model (if userId is provided)
      if (query.userId) {
        this.logger.debug('Checking for user-specific default model', {
          userId: query.userId,
        });

        const userDefaultModel =
          await this.userDefaultModelsRepository.findByUserId(query.userId);

        if (userDefaultModel) {
          this.logger.debug('User default model found', {
            userId: query.userId,
            modelId: userDefaultModel.id,
          });
          return userDefaultModel;
        }

        this.logger.debug(
          'No user default model found, falling back to org default',
          {
            userId: query.userId,
          },
        );
      }

      // Step 2: Check for organization default model
      this.logger.debug('Checking for organization default model', {
        orgId: query.orgId,
      });

      const defaultModel =
        await this.permittedModelsRepository.findOrgDefaultLanguage(
          query.orgId,
        );

      if (defaultModel) {
        this.logger.debug('Organization default model found', {
          orgId: query.orgId,
          modelId: defaultModel.id,
        });
        return defaultModel;
      }

      // Step 3: Fall back to first available model in the organization
      this.logger.debug(
        'No org default model found, falling back to first available model',
        {
          orgId: query.orgId,
        },
      );

      const availableModels =
        await this.permittedModelsRepository.findManyLanguage(query.orgId);

      let index = 0;
      while (index < availableModels.length) {
        const model = availableModels[index];
        if (query.blacklistedModelIds?.includes(model.id)) {
          index++;
          continue;
        }
        return model;
      }

      // Step 4: No models available at all
      this.logger.error('No models available for organization', {
        orgId: query.orgId,
        userId: query.userId,
      });
      throw new DefaultModelNotFoundError(query.orgId);
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }
      this.logger.error('Failed to get default model', {
        orgId: query.orgId,
        userId: query.userId,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw error;
    }
  }
}
