import { PermittedProvidersRepository } from 'src/domain/models/application/ports/permitted-providers.repository';
import { GetAllPermittedProvidersQuery } from './get-all-permitted-providers.query';
import { Injectable, Logger } from '@nestjs/common';
import { ModelError, UnexpectedModelError } from '../../models.errors';
import { ModelProviderInfoRegistry } from '../../registry/model-provider-info.registry';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelProviderLocation } from 'src/domain/models/domain/value-objects/model-provider-locations.enum';

export interface PermittedProviderWithInfo {
  provider: ModelProvider;
  orgId: string;
  displayName: string;
  hostedIn: ModelProviderLocation;
}

@Injectable()
export class GetAllPermittedProvidersUseCase {
  private readonly logger = new Logger(GetAllPermittedProvidersUseCase.name);

  constructor(
    private readonly permittedProvidersRepository: PermittedProvidersRepository,
    private readonly modelProviderInfoRegistry: ModelProviderInfoRegistry,
  ) {}

  async execute(
    query: GetAllPermittedProvidersQuery,
  ): Promise<PermittedProviderWithInfo[]> {
    try {
      const permittedProviders =
        await this.permittedProvidersRepository.findAll(query.orgId);

      // Enrich with provider info
      const enrichedProviders: PermittedProviderWithInfo[] = [];

      for (const permittedProvider of permittedProviders) {
        try {
          const providerInfo =
            this.modelProviderInfoRegistry.getModelProviderInfo(
              permittedProvider.provider,
            );

          enrichedProviders.push({
            provider: permittedProvider.provider,
            orgId: permittedProvider.orgId,
            displayName: providerInfo.displayName,
            hostedIn: providerInfo.hostedIn,
          });
        } catch (error) {
          this.logger.warn(
            `Provider info not found for ${permittedProvider.provider}`,
            error,
          );
          // Skip providers that don't have info configured
        }
      }

      return enrichedProviders;
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }
      this.logger.error(error);
      throw new UnexpectedModelError(error);
    }
  }
}
