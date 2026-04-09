import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ModelProviderInfoRegistry } from '../../registry/model-provider-info.registry';
import { ModelsRepository } from '../../ports/models.repository';
import { GetAvailableImageGenerationModelsQuery } from './get-available-image-generation-models.query';

@Injectable()
export class GetAvailableImageGenerationModelsUseCase {
  private readonly logger = new Logger(
    GetAvailableImageGenerationModelsUseCase.name,
  );

  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly contextService: ContextService,
    private readonly configService: ConfigService,
    private readonly modelProviderInfoRegistry: ModelProviderInfoRegistry,
  ) {}

  async execute(
    query: GetAvailableImageGenerationModelsQuery,
  ): Promise<ImageGenerationModel[]> {
    const orgRole = this.contextService.get('role');
    const systemRole = this.contextService.get('systemRole');
    if (orgRole !== UserRole.ADMIN && systemRole !== SystemRole.SUPER_ADMIN) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('getAvailableImageGenerationModels', query);
    const allModels = await this.modelsRepository.findAll();
    const availableModels = allModels.filter(
      (model): model is ImageGenerationModel =>
        model instanceof ImageGenerationModel &&
        !model.isArchived &&
        this.hasApiKeyForProvider(model.provider),
    );
    this.logger.debug('Available image-generation models', {
      allModels: availableModels,
    });
    return availableModels;
  }

  private hasApiKeyForProvider(provider?: ModelProvider): boolean {
    if (!provider) {
      this.logger.warn(
        'Model provider not defined, skipping availability check',
      );
      return false;
    }

    const configKey = this.modelProviderInfoRegistry.getConfigKey(provider);
    if (!configKey) {
      this.logger.warn(`No config mapping found for provider: ${provider}`);
      return false;
    }

    const apiKey = this.configService.get<string>(configKey);
    return !!apiKey && apiKey.trim() !== '';
  }
}
