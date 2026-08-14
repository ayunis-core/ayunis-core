import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    @InjectPinoLogger(GetConfiguredModelsByTypeUseCase.name)
    private readonly logger: PinoLogger,

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

    this.logger.info(
      {
        orgId: query.orgId,
        type: query.type,
      },
      'getConfiguredModelsByType',
    );
    const allModels = await this.modelsRepository.findAll();
    const configuredModels = allModels.filter(
      (model) =>
        model.type === query.type &&
        !model.isArchived &&
        this.hasApiKeyForProvider(model.provider),
    );
    this.logger.debug(
      {
        type: query.type,
        models: configuredModels,
      },
      'Configured models by type',
    );
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
      this.logger.warn({ provider }, 'No config mapping found for provider');
      return false;
    }

    const apiKey = this.configService.get<string>(configKey);
    return !!apiKey && apiKey.trim() !== '';
  }
}
