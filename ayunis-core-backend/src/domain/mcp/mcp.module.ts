import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { McpCredentialEncryptionPort } from './application/ports/mcp-credential-encryption.port';
import { McpCredentialEncryptionService } from './infrastructure/encryption/mcp-credential-encryption.service';
import { McpClientPort } from './application/ports/mcp-client.port';
import { McpSdkClientAdapter } from './infrastructure/clients/mcp-sdk-client.adapter';
import { McpClientService } from './application/services/mcp-client.service';
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

// Use Cases
import { CreateMcpIntegrationUseCase } from './application/use-cases/create-mcp-integration/create-mcp-integration.use-case';
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

// Controller and Mappers
import { McpIntegrationsController } from './presenters/http/mcp-integrations.controller';
import { McpIntegrationDtoMapper } from './presenters/http/mappers/mcp-integration-dto.mapper';
import { PredefinedConfigDtoMapper } from './presenters/http/mappers/predefined-config-dto.mapper';

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
    ]),
    SourcesModule, // Import sources module for CreateDataSourceUseCase
  ],
  controllers: [McpIntegrationsController],
  providers: [
    {
      provide: McpCredentialEncryptionPort,
      useClass: McpCredentialEncryptionService,
    },
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
    McpIntegrationMapper,
    McpIntegrationFactory,
    McpIntegrationAuthFactory,
    McpClientService,
    PredefinedMcpIntegrationRegistry,
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
    // Mappers
    McpIntegrationDtoMapper,
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
