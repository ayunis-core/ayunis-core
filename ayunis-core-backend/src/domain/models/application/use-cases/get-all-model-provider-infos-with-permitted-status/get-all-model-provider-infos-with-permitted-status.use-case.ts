import { Injectable, Logger } from '@nestjs/common';
import { ModelProviderInfoRegistry } from '../../registry/model-provider-info.registry';
import { GetAllPermittedProvidersUseCase } from '../get-all-permitted-providers/get-all-permitted-providers.use-case';
import { GetAllPermittedProvidersQuery } from '../get-all-permitted-providers/get-all-permitted-providers.query';
import { GetAllModelProviderInfosWithPermittedStatusQuery } from './get-all-model-provider-infos-with-permitted-status.query';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelProviderInfoEntity } from 'src/domain/models/domain/model-provider-info.entity';
import { ModelError, UnexpectedModelError } from '../../models.errors';
import { ModelProviderLocation } from 'src/domain/models/domain/value-objects/model-provider-locations.enum';

export interface ModelProviderInfoWithPermittedStatus {
  provider: ModelProvider;
  displayName: string;
  hostedIn: ModelProviderLocation;
  isPermitted: boolean;
}

@Injectable()
export class GetAllModelProviderInfosWithPermittedStatusUseCase {
  private readonly logger = new Logger(
    GetAllModelProviderInfosWithPermittedStatusUseCase.name,
  );

  constructor(
    private readonly modelProviderInfoRegistry: ModelProviderInfoRegistry,
    private readonly getAllPermittedProvidersUseCase: GetAllPermittedProvidersUseCase,
  ) {}

  async execute(
    query: GetAllModelProviderInfosWithPermittedStatusQuery,
  ): Promise<ModelProviderInfoWithPermittedStatus[]> {
    try {
      // Get all available provider infos
      const allProviders = Object.values(ModelProvider);
      const allProviderInfos: ModelProviderInfoEntity[] = [];

      for (const provider of allProviders) {
        try {
          const providerInfo =
            this.modelProviderInfoRegistry.getModelProviderInfo(provider);
          allProviderInfos.push(providerInfo);
        } catch (error) {
          this.logger.warn(`Provider info not found for ${provider}`, error);
          // Skip providers that don't have info configured
        }
      }

      // Get permitted providers for the organization
      const permittedProvidersQuery = new GetAllPermittedProvidersQuery(
        query.orgId,
      );
      const permittedProviders =
        await this.getAllPermittedProvidersUseCase.execute(
          permittedProvidersQuery,
        );
      const permittedProviderSet = new Set(
        permittedProviders.map((pp) => pp.provider),
      );

      // Combine the data
      return allProviderInfos.map((providerInfo) => ({
        provider: providerInfo.provider,
        displayName: providerInfo.displayName,
        hostedIn: providerInfo.hostedIn,
        isPermitted: permittedProviderSet.has(providerInfo.provider),
      }));
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }
      this.logger.error(error);
      throw new UnexpectedModelError(error as Error);
    }
  }
}
