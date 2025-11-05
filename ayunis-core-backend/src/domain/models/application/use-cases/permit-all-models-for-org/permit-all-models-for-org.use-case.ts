import { Injectable, Logger } from '@nestjs/common';
import { PermitAllModelsForOrgCommand } from './permit-all-models-for-org.command';
import { ModelRegistry } from '../../registry/model.registry';
import { CreatePermittedModelUseCase } from '../create-permitted-model/create-permitted-model.use-case';
import { CreatePermittedModelCommand } from '../create-permitted-model/create-permitted-model.command';
import { CreatePermittedProviderUseCase } from '../create-permitted-provider/create-permitted-provider.use-case';
import { CreatePermittedProviderCommand } from '../create-permitted-provider/create-permitted-provider.command';
import { PermittedProvider } from 'src/domain/models/domain/permitted-model-provider.entity';
import { PermittedProvidersRepository } from '../../ports/permitted-providers.repository';
import { IsProviderPermittedUseCase } from '../is-provider-permitted/is-provider-permitted.use-case';
import { IsProviderPermittedQuery } from '../is-provider-permitted/is-provider-permitted.query';
import { IsModelPermittedUseCase } from '../is-model-permitted/is-model-permitted.use-case';
import { IsModelPermittedQuery } from '../is-model-permitted/is-model-permitted.query';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { Model } from 'src/domain/models/domain/model.entity';
import { UUID } from 'crypto';

@Injectable()
export class PermitAllModelsForOrgUseCase {
  private readonly logger = new Logger(PermitAllModelsForOrgUseCase.name);
  private static readonly PROVIDERS_NO_LEGAL_ACCEPTANCE: ModelProvider[] = [
    ModelProvider.OLLAMA,
    ModelProvider.AYUNIS,
  ];

  constructor(
    private readonly modelRegistry: ModelRegistry,
    private readonly createPermittedModelUseCase: CreatePermittedModelUseCase,
    private readonly createPermittedProviderUseCase: CreatePermittedProviderUseCase,
    private readonly permittedProvidersRepository: PermittedProvidersRepository,
    private readonly isProviderPermittedUseCase: IsProviderPermittedUseCase,
    private readonly isModelPermittedUseCase: IsModelPermittedUseCase,
  ) {}

  async execute(command: PermitAllModelsForOrgCommand): Promise<void> {
    this.logger.log('execute', {
      orgId: command.orgId,
      userId: command.userId,
    });

    try {
      const allAvailableModels = this.getAllAvailableModels(command.orgId);
      if (allAvailableModels.length === 0) {
        return;
      }

      const uniqueProviders = this.extractUniqueProviders(allAvailableModels);
      await this.permitAllProviders(uniqueProviders, command);
      await this.permitAllModels(allAvailableModels, command);

      this.logger.log('Completed permitting all models for org', {
        orgId: command.orgId,
        providersPermitted: uniqueProviders.length,
        modelsAvailable: allAvailableModels.length,
      });
    } catch (error) {
      this.logger.error('Error in permit all models for org', {
        orgId: command.orgId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - this is a best-effort operation
    }
  }

  private getAllAvailableModels(orgId: UUID) {
    const allAvailableModels = this.modelRegistry.getAllAvailableModels();
    this.logger.debug('All available models', {
      count: allAvailableModels.length,
      models: allAvailableModels.map((m) => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
      })),
    });

    if (allAvailableModels.length === 0) {
      this.logger.warn('No available models found to permit', { orgId });
    }

    return allAvailableModels;
  }

  private extractUniqueProviders(models: Model[]): ModelProvider[] {
    return Array.from(new Set(models.map((m) => m.provider)));
  }

  private async permitAllProviders(
    providers: ModelProvider[],
    command: PermitAllModelsForOrgCommand,
  ): Promise<void> {
    for (const provider of providers) {
      await this.permitProvider(provider, command);
    }
  }

  private async permitProvider(
    provider: ModelProvider,
    command: PermitAllModelsForOrgCommand,
  ): Promise<void> {
    try {
      const isPermitted = await this.isProviderPermittedUseCase.execute(
        new IsProviderPermittedQuery(command.orgId, provider),
      );

      if (isPermitted) {
        this.logger.debug('Provider already permitted', {
          orgId: command.orgId,
          provider,
        });
        return;
      }

      await this.createPermittedProvider(provider, command);
    } catch (error) {
      this.logger.error('Error permitting provider', {
        orgId: command.orgId,
        provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async createPermittedProvider(
    provider: ModelProvider,
    command: PermitAllModelsForOrgCommand,
  ): Promise<void> {
    const permittedProvider = new PermittedProvider({
      provider,
      orgId: command.orgId,
    });

    const needsLegalAcceptance =
      !PermitAllModelsForOrgUseCase.PROVIDERS_NO_LEGAL_ACCEPTANCE.includes(
        provider,
      );

    if (needsLegalAcceptance && !command.userId) {
      this.logger.warn(
        'Skipping provider permission (no userId for legal acceptance)',
        {
          orgId: command.orgId,
          provider,
        },
      );
      return;
    }

    if (needsLegalAcceptance) {
      await this.createPermittedProviderUseCase.execute(
        new CreatePermittedProviderCommand({
          userId: command.userId!,
          orgId: command.orgId,
          permittedProvider,
        }),
      );
      this.logger.log('Permitted provider', {
        orgId: command.orgId,
        provider,
      });
    } else {
      await this.permittedProvidersRepository.create(
        command.orgId,
        permittedProvider,
      );
      this.logger.log('Permitted provider (no legal acceptance needed)', {
        orgId: command.orgId,
        provider,
      });
    }
  }

  private async permitAllModels(
    models: Model[],
    command: PermitAllModelsForOrgCommand,
  ): Promise<void> {
    let embeddingModelPermitted = false;

    for (const model of models) {
      const shouldPermit = await this.shouldPermitModel(
        model,
        command.orgId,
        embeddingModelPermitted,
      );

      if (!shouldPermit) {
        continue;
      }

      if (model instanceof EmbeddingModel) {
        embeddingModelPermitted = true;
      }

      await this.permitModel(model, command.orgId);
    }
  }

  private async shouldPermitModel(
    model: Model,
    orgId: UUID,
    embeddingModelPermitted: boolean,
  ): Promise<boolean> {
    try {
      const isPermitted = await this.isModelPermittedUseCase.execute(
        new IsModelPermittedQuery({
          modelId: model.id,
          orgId,
        }),
      );

      if (isPermitted) {
        this.logger.debug('Model already permitted', {
          orgId,
          modelId: model.id,
          modelName: model.name,
        });
        return false;
      }

      if (model instanceof EmbeddingModel && embeddingModelPermitted) {
        this.logger.debug('Skipping embedding model (one already permitted)', {
          orgId,
          modelId: model.id,
          modelName: model.name,
        });
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Error checking if model should be permitted', {
        orgId,
        modelId: model.id,
        modelName: model.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  private async permitModel(model: Model, orgId: UUID): Promise<void> {
    try {
      await this.createPermittedModelUseCase.execute(
        new CreatePermittedModelCommand(model.id, orgId),
      );
      this.logger.log('Permitted model', {
        orgId,
        modelId: model.id,
        modelName: model.name,
        provider: model.provider,
      });
    } catch (error) {
      this.logger.error('Error permitting model', {
        orgId,
        modelId: model.id,
        modelName: model.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
