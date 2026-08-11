import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { McpCredentialEncryptionPort } from './application/ports/mcp-credential-encryption.port';
import { McpCredentialEncryptionService } from './infrastructure/encryption/mcp-credential-encryption.service';
import { McpClientPort } from './application/ports/mcp-client.port';
import { McpCapabilityCacheService } from './application/services/mcp-capability-cache.service';
import { McpSdkClientAdapter } from './infrastructure/clients/mcp-sdk-client.adapter';
import { McpClientPoolService } from './infrastructure/clients/mcp-client-pool.service';
import { McpClientService } from './application/services/mcp-client.service';
import { McpConfigService } from './application/services/mcp-config.service';
import { ConnectionValidationService } from './application/services/connection-validation.service';
import { PredefinedMcpIntegrationRegistry } from './application/registries/predefined-mcp-integration-registry.service';
import { McpIntegrationsRepositoryPort } from './application/ports/mcp-integrations.repository.port';
import { McpIntegrationsRepository } from './infrastructure/persistence/postgres/mcp-integrations.repository';
import { McpIntegrationUserConfigRepositoryPort } from './application/ports/mcp-integration-user-config.repository.port';
import { McpIntegrationUserConfigRepository } from './infrastructure/persistence/postgres/mcp-integration-user-config.repository';
import {
  BearerMcpIntegrationAuthRecord,
  CustomHeaderMcpIntegrationAuthRecord,
  CustomMcpIntegrationRecord,
  MarketplaceMcpIntegrationRecord,
  McpIntegrationAuthRecord,
  McpIntegrationRecord,
  McpIntegrationUserConfigRecord,
  NoAuthMcpIntegrationAuthRecord,
  OAuthMcpIntegrationAuthRecord,
  PredefinedMcpIntegrationRecord,
} from './infrastructure/persistence/postgres/schema';
import { McpIntegrationMapper } from './infrastructure/persistence/postgres/mappers/mcp-integration.mapper';
import { McpIntegrationFactory } from './application/factories/mcp-integration.factory';
import { McpIntegrationAuthFactory } from './application/factories/mcp-integration-auth.factory';
import { SourcesModule } from '../sources/sources.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';

// Use Cases
import { CreateMcpIntegrationUseCase } from './application/use-cases/create-mcp-integration/create-mcp-integration.use-case';
import { InstallMarketplaceIntegrationUseCase } from './application/use-cases/install-marketplace-integration/install-marketplace-integration.use-case';
import { SetUserMcpConfigUseCase } from './application/use-cases/set-user-mcp-config/set-user-mcp-config.use-case';
import { GetUserMcpConfigUseCase } from './application/use-cases/get-user-mcp-config/get-user-mcp-config.use-case';
import { GetMcpIntegrationUseCase } from './application/use-cases/get-mcp-integration/get-mcp-integration.use-case';
import { GetMcpIntegrationsByIdsUseCase } from './application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.use-case';
import { ListOrgMcpIntegrationsUseCase } from './application/use-cases/list-org-mcp-integrations/list-org-mcp-integrations.use-case';
import { ListAvailableMcpIntegrationsUseCase } from './application/use-cases/list-available-mcp-integrations/list-available-mcp-integrations.use-case';
import { UpdateMcpIntegrationUseCase } from './application/use-cases/update-mcp-integration/update-mcp-integration.use-case';
import { DeleteMcpIntegrationUseCase } from './application/use-cases/delete-mcp-integration/delete-mcp-integration.use-case';
import { EnableMcpIntegrationUseCase } from './application/use-cases/enable-mcp-integration/enable-mcp-integration.use-case';
import { DisableMcpIntegrationUseCase } from './application/use-cases/disable-mcp-integration/disable-mcp-integration.use-case';
import { ValidateMcpIntegrationUseCase } from './application/use-cases/validate-mcp-integration/validate-mcp-integration.use-case';
import { ListPredefinedMcpIntegrationConfigsUseCase } from './application/use-cases/list-predefined-mcp-integration-configs/list-predefined-mcp-integration-configs.use-case';
import { RetrieveMcpResourceUseCase } from './application/use-cases/retrieve-mcp-resource/retrieve-mcp-resource.use-case';
import { DiscoverMcpCapabilitiesUseCase } from './application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.use-case';
import { ExecuteMcpToolUseCase } from './application/use-cases/execute-mcp-tool/execute-mcp-tool.use-case';
import { GetMcpPromptUseCase } from './application/use-cases/get-mcp-prompt/get-mcp-prompt.use-case';
import { ValidateIntegrationAccessService } from './application/services/validate-integration-access.service';
import { McpOAuthClientRegistrationRepositoryPort } from './application/ports/mcp-oauth-client-registration.repository.port';
import { McpOAuthPendingSessionRepositoryPort } from './application/ports/mcp-oauth-pending-session.repository.port';
import { McpOAuthUserTokenRepositoryPort } from './application/ports/mcp-oauth-user-token.repository.port';
import { McpOAuthClientRegistrationRepository } from './infrastructure/persistence/postgres/mcp-oauth-client-registration.repository';
import { McpOAuthPendingSessionRepository } from './infrastructure/persistence/postgres/mcp-oauth-pending-session.repository';
import { McpOAuthUserTokenRepository } from './infrastructure/persistence/postgres/mcp-oauth-user-token.repository';
import {
  McpOAuthClientRegistrationRecord,
  McpOAuthPendingSessionRecord,
  McpOAuthUserTokenRecord,
} from './infrastructure/persistence/postgres/schema';

// Controller and Mappers
import { McpIntegrationsController } from './presenters/http/mcp-integrations.controller';
import { McpIntegrationDtoMapper } from './presenters/http/mappers/mcp-integration-dto.mapper';
import { PredefinedConfigDtoMapper } from './presenters/http/mappers/predefined-config-dto.mapper';
import { McpOAuthClientConfigurationService } from './application/services/mcp-oauth-client-configuration.service';
import { McpOAuthMetadataController } from './presenters/http/mcp-oauth-metadata.controller';
import { McpOAuthProviderFactory } from './infrastructure/clients/mcp-oauth-provider.factory';
import { McpOAuthAuthorizationService } from './application/services/mcp-oauth-authorization.service';
import { McpOAuthFetchPort } from './application/ports/mcp-oauth-fetch.port';
import { McpOAuthFetchService } from './infrastructure/clients/mcp-oauth-fetch.service';
import { McpIntegrationResponseMapper } from './presenters/http/mappers/mcp-integration-response.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      McpIntegrationRecord,
      CustomMcpIntegrationRecord,
      PredefinedMcpIntegrationRecord,
      MarketplaceMcpIntegrationRecord,
      McpIntegrationAuthRecord,
      NoAuthMcpIntegrationAuthRecord,
      BearerMcpIntegrationAuthRecord,
      CustomHeaderMcpIntegrationAuthRecord,
      OAuthMcpIntegrationAuthRecord,
      McpIntegrationUserConfigRecord,
      McpOAuthClientRegistrationRecord,
      McpOAuthUserTokenRecord,
      McpOAuthPendingSessionRecord,
    ]),
    SourcesModule, // Import sources module for CreateDataSourceUseCase
    MarketplaceModule,
  ],
  controllers: [McpIntegrationsController, McpOAuthMetadataController],
  providers: [
    {
      provide: McpCredentialEncryptionPort,
      useClass: McpCredentialEncryptionService,
    },
    McpClientPoolService,
    {
      provide: McpClientPort,
      useClass: McpSdkClientAdapter,
    },
    {
      provide: McpIntegrationsRepositoryPort,
      useClass: McpIntegrationsRepository,
    },
    {
      provide: McpIntegrationUserConfigRepositoryPort,
      useClass: McpIntegrationUserConfigRepository,
    },
    {
      provide: McpOAuthClientRegistrationRepositoryPort,
      useClass: McpOAuthClientRegistrationRepository,
    },
    {
      provide: McpOAuthUserTokenRepositoryPort,
      useClass: McpOAuthUserTokenRepository,
    },
    {
      provide: McpOAuthPendingSessionRepositoryPort,
      useClass: McpOAuthPendingSessionRepository,
    },
    {
      provide: McpOAuthFetchPort,
      useClass: McpOAuthFetchService,
    },
    McpIntegrationMapper,
    McpIntegrationFactory,
    McpIntegrationAuthFactory,
    McpClientService,
    McpCapabilityCacheService,
    McpConfigService,
    ConnectionValidationService,
    PredefinedMcpIntegrationRegistry,
    ValidateIntegrationAccessService,
    McpOAuthClientConfigurationService,
    McpOAuthProviderFactory,
    McpOAuthAuthorizationService,
    // Use Cases
    CreateMcpIntegrationUseCase,
    GetMcpIntegrationUseCase,
    GetMcpIntegrationsByIdsUseCase,
    ListOrgMcpIntegrationsUseCase,
    ListAvailableMcpIntegrationsUseCase,
    UpdateMcpIntegrationUseCase,
    DeleteMcpIntegrationUseCase,
    EnableMcpIntegrationUseCase,
    DisableMcpIntegrationUseCase,
    ValidateMcpIntegrationUseCase,
    ListPredefinedMcpIntegrationConfigsUseCase,
    RetrieveMcpResourceUseCase,
    DiscoverMcpCapabilitiesUseCase,
    ExecuteMcpToolUseCase,
    GetMcpPromptUseCase,
    InstallMarketplaceIntegrationUseCase,
    SetUserMcpConfigUseCase,
    GetUserMcpConfigUseCase,
    // Mappers
    McpIntegrationDtoMapper,
    McpIntegrationResponseMapper,
    PredefinedConfigDtoMapper,
  ],
  exports: [
    McpCredentialEncryptionPort,
    McpClientPort,
    McpIntegrationsRepositoryPort,
    McpIntegrationUserConfigRepositoryPort,
    PredefinedMcpIntegrationRegistry,
    RetrieveMcpResourceUseCase,
    DiscoverMcpCapabilitiesUseCase,
    ExecuteMcpToolUseCase,
    GetMcpPromptUseCase,
    GetMcpIntegrationsByIdsUseCase,
  ],
})
export class McpModule {}
