import { Injectable, Logger } from '@nestjs/common';
import { GetAvailableModelsQuery } from './get-available-models.query';
import { Model } from 'src/domain/models/domain/model.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ModelsRepository } from '../../ports/models.repository';
import { ConfigService } from '@nestjs/config';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

@Injectable()
export class GetAvailableModelsUseCase {
  private readonly logger = new Logger(GetAvailableModelsUseCase.name);

  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly contextService: ContextService,
    private readonly configService: ConfigService,
  ) {}

  async execute(query: GetAvailableModelsQuery): Promise<Model[]> {
    const orgRole = this.contextService.get('role');
    const systemRole = this.contextService.get('systemRole');
    if (orgRole !== UserRole.ADMIN && systemRole !== SystemRole.SUPER_ADMIN) {
      throw new UnauthorizedAccessError();
    }
    this.logger.log('getAvailableModels', query);
    const allModels = await this.modelsRepository.findAll();
    const availableModels = allModels.filter((model) => {
      if (model.isArchived) {
        return false;
      }
      return this.hasApiKeyForProvider(model.provider);
    });
    this.logger.debug('All available models', {
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

    const providerConfigMap = {
      [ModelProvider.OTC]: 'models.otc.apiKey',
      [ModelProvider.MISTRAL]: 'models.mistral.apiKey',
      [ModelProvider.OPENAI]: 'models.openai.apiKey',
      [ModelProvider.ANTHROPIC]: 'models.anthropic.apiKey',
      [ModelProvider.BEDROCK]: 'models.bedrock.awsRegion',
      [ModelProvider.OLLAMA]: 'models.ollama.baseURL',
      [ModelProvider.SYNAFORCE]: 'models.synaforce.baseURL',
      [ModelProvider.AYUNIS]: 'models.ayunis.baseURL',
      [ModelProvider.AZURE]: 'models.azure.apiKey',
    } as const;

    const configKey = providerConfigMap[provider];

    if (!configKey) {
      this.logger.warn(`No config mapping found for provider: ${provider}`);
      return false;
    }

    const apiKey = this.configService.get<string>(configKey);
    return !!apiKey && apiKey.trim() !== '';
  }
}
