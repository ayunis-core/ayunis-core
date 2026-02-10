import { Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { NoPermittedModelError } from '../agents.errors';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { DefaultModelNotFoundError } from 'src/domain/models/application/models.errors';

@Injectable()
export class ModelResolverService {
  private readonly logger = new Logger(ModelResolverService.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
  ) {}

  /**
   * Resolve the best model for an agent using the fallback chain:
   * 1. Exact match on recommended model name + provider
   * 2. User's default model
   * 3. Org's default model
   * 4. First available permitted language model
   *
   * @throws NoPermittedModelError if no model can be resolved
   */
  async resolve(
    orgId: UUID,
    userId: UUID,
    recommendedModelName: string | null,
    recommendedModelProvider: string | null,
  ): Promise<PermittedLanguageModel> {
    // Try exact match on recommended model name + provider
    if (recommendedModelName && recommendedModelProvider) {
      const providerEnum =
        recommendedModelProvider.toLowerCase() as ModelProvider;
      if (Object.values(ModelProvider).includes(providerEnum)) {
        const exactMatch = await this.permittedModelsRepository.findOneLanguage(
          {
            name: recommendedModelName,
            provider: providerEnum,
            orgId,
          },
        );
        if (exactMatch) {
          this.logger.debug('Found exact model match', {
            name: recommendedModelName,
            provider: recommendedModelProvider,
          });
          return exactMatch;
        }
      }
    }

    return this.resolveFallback(orgId, userId);
  }

  /**
   * Resolve a fallback model without trying a recommended model.
   * Returns null instead of throwing if no model is found.
   */
  async resolveFallbackOrNull(
    orgId: UUID,
    userId: UUID,
  ): Promise<PermittedLanguageModel | null> {
    try {
      return await this.getDefaultModelUseCase.execute(
        new GetDefaultModelQuery({ orgId, userId }),
      );
    } catch (error) {
      if (error instanceof DefaultModelNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Resolve a fallback model (user default → org default → first available).
   *
   * @throws NoPermittedModelError if no model can be resolved
   */
  private async resolveFallback(
    orgId: UUID,
    userId: UUID,
  ): Promise<PermittedLanguageModel> {
    const model = await this.resolveFallbackOrNull(orgId, userId);
    if (model) return model;
    throw new NoPermittedModelError();
  }
}
