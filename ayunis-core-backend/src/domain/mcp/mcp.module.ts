import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { McpCredentialEncryptionPort } from './application/ports/mcp-credential-encryption.port';
import { McpCredentialEncryptionService } from './infrastructure/encryption/mcp-credential-encryption.service';
import { McpClientPort } from './application/ports/mcp-client.port';
import { McpSdkClientAdapter } from './infrastructure/clients/mcp-sdk-client.adapter';
import { PredefinedMcpIntegrationRegistryService } from './application/services/predefined-mcp-integration-registry.service';
import { McpIntegrationsRepositoryPort } from './application/ports/mcp-integrations.repository.port';
import { McpIntegrationsRepository } from './infrastructure/persistence/postgres/mcp-integrations.repository';
import { McpIntegrationRecord } from './infrastructure/persistence/postgres/schema/mcp-integration.record';
import { McpIntegrationMapper } from './infrastructure/persistence/postgres/mappers/mcp-integration.mapper';
import { SourcesModule } from '../sources/sources.module';

// Use Cases
import { CreateMcpIntegrationUseCase } from './application/use-cases/create-mcp-integration/create-mcp-integration.use-case';
import { GetMcpIntegrationUseCase } from './application/use-cases/get-mcp-integration/get-mcp-integration.use-case';
import { ListOrgMcpIntegrationsUseCase } from './application/use-cases/list-org-mcp-integrations/list-org-mcp-integrations.use-case';
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
import { GetMcpHealthUseCase } from './application/use-cases/get-mcp-health/get-mcp-health.use-case';

// Controller and Mapper
import { McpIntegrationsController } from './presenters/http/mcp-integrations.controller';
import { McpIntegrationDtoMapper } from './presenters/http/mappers/mcp-integration-dto.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([McpIntegrationRecord]),
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
    McpIntegrationMapper,
    PredefinedMcpIntegrationRegistryService,
    // Use Cases
    CreateMcpIntegrationUseCase,
    GetMcpIntegrationUseCase,
    ListOrgMcpIntegrationsUseCase,
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
    GetMcpHealthUseCase,
    // Mapper
    McpIntegrationDtoMapper,
  ],
  exports: [
    McpCredentialEncryptionPort,
    McpClientPort,
    McpIntegrationsRepositoryPort,
    PredefinedMcpIntegrationRegistryService,
    RetrieveMcpResourceUseCase,
    DiscoverMcpCapabilitiesUseCase,
    ExecuteMcpToolUseCase,
    GetMcpPromptUseCase,
  ],
})
export class McpModule {}
