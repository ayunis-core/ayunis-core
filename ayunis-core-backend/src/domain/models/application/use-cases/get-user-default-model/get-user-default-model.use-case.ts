import { Injectable, Logger } from '@nestjs/common';
import { GetUserDefaultModelQuery } from './get-user-default-model.query';
import { PermittedLanguageModel } from '../../../domain/permitted-model.entity';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { GetEffectiveLanguageModelsUseCase } from '../get-effective-language-models/get-effective-language-models.use-case';
import { GetEffectiveLanguageModelsQuery } from '../get-effective-language-models/get-effective-language-models.query';
import { ModelError } from '../../models.errors';

@Injectable()
export class GetUserDefaultModelUseCase {
  private readonly logger = new Logger(GetUserDefaultModelUseCase.name);

  constructor(
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
    private readonly getEffectiveLanguageModelsUseCase: GetEffectiveLanguageModelsUseCase,
  ) {}

  async execute(
    query: GetUserDefaultModelQuery,
  ): Promise<PermittedLanguageModel | null> {
    this.logger.log('execute', {
      userId: query.userId,
      orgId: query.orgId,
    });

    try {
      const preferredModel =
        await this.userDefaultModelsRepository.findByUserId(query.userId);

      if (!preferredModel) {
        this.logger.debug('No user default model found', {
          userId: query.userId,
        });
        return null;
      }

      // The stored preference is a catalog model id. Resolve to a concrete
      // permitted-model record in the user's effective set so the API returns
      // the same shape callers always expected. If the model is no longer
      // available to the user, treat as "no default" — `GetDefaultModelUseCase`
      // will fall back to team/org defaults at chat time.
      const { models: effectiveModels } =
        await this.getEffectiveLanguageModelsUseCase.execute(
          new GetEffectiveLanguageModelsQuery(query.orgId, query.userId),
        );

      const matching = effectiveModels.find(
        (m) => m.model.id === preferredModel.id,
      );

      if (!matching) {
        this.logger.debug(
          'User preferred model not currently available in effective set',
          {
            userId: query.userId,
            orgId: query.orgId,
            preferredModelId: preferredModel.id,
          },
        );
        return null;
      }

      return matching;
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
