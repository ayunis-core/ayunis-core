import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Model } from 'src/domain/models/domain/model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ModelsRepository } from '../../ports/models.repository';
import { ModelProviderInfoRegistry } from '../../registry/model-provider-info.registry';
import { GetConfiguredModelsByTypeQuery } from './get-configured-models-by-type.query';

@Injectable()
export class GetConfiguredModelsByTypeUseCase {
  private readonly logger = new Logger(GetConfiguredModelsByTypeUseCase.name);

  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly contextService: ContextService,
    private readonly configService: ConfigService,
    private readonly modelProviderInfoRegistry: ModelProviderInfoRegistry,
  ) {}

  async execute(query: GetConfiguredModelsByTypeQuery): Promise<Model[]> {
    const orgRole = this.contextService.get('role');
    const systemRole = this.contextService.get('systemRole');
    if (orgRole !== UserRole.ADMIN && systemRole !== SystemRole.SUPER_ADMIN) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('getConfiguredModelsByType', {
      orgId: query.orgId,
      type: query.type,
    });
    const allModels = await this.modelsRepository.findAll();
    const configuredModels = allModels.filter(
      (model) =>
        model.type === query.type &&
        !model.isArchived &&
        this.hasApiKeyForProvider(model.provider),
    );
    this.logger.debug('Configured models by type', {
      type: query.type,
      models: configuredModels,
    });
    return configuredModels;
  }

  private hasApiKeyForProvider(provider?: ModelProvider): boolean {
    if (!provider) {
      this.logger.warn(
        'Model provider not defined, skipping configuration check',
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
