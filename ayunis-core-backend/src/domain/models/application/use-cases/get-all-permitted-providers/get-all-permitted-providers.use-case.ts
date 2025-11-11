import { PermittedProvidersRepository } from 'src/domain/models/application/ports/permitted-providers.repository';
import { GetAllPermittedProvidersQuery } from './get-all-permitted-providers.query';
import { Injectable, Logger } from '@nestjs/common';
import { ModelError, UnexpectedModelError } from '../../models.errors';
import { ModelProviderInfoRegistry } from '../../registry/model-provider-info.registry';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelProviderLocation } from 'src/domain/models/domain/value-objects/model-provider-locations.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ApplicationError } from 'src/common/errors/base.error';

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
    private readonly contextService: ContextService,
  ) {}

  async execute(
    query: GetAllPermittedProvidersQuery,
  ): Promise<PermittedProviderWithInfo[]> {
    try {
      const orgId = this.contextService.get('orgId');
      const systemRole = this.contextService.get('systemRole');
      const isFromOrg = orgId === query.orgId;
      const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
      if (!isFromOrg && !isSuperAdmin) {
        throw new UnauthorizedAccessError();
      }
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
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(error);
      throw new UnexpectedModelError(
        error instanceof Error ? error : new Error('Unknown error'),
      );
    }
  }
}
