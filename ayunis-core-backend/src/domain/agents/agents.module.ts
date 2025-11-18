import { forwardRef, Module } from '@nestjs/common';
import { ModelsModule } from 'src/domain/models/models.module';
import { ToolsModule } from 'src/domain/tools/tools.module';
import { SourcesModule } from '../sources/sources.module';
import { McpModule } from '../mcp/mcp.module';
import { LocalAgentsRepositoryModule } from './infrastructure/persistence/local/local-agent-repository.module';
import { LocalAgentRepository } from './infrastructure/persistence/local/local-agent.repository';
import { AgentRepository } from './application/ports/agent.repository';
import { AgentRecord } from './infrastructure/persistence/local/schema/agent.record';
import { AgentSourceAssignmentRecord } from './infrastructure/persistence/local/schema/agent-source-assignment.record';
import { TypeOrmModule } from '@nestjs/typeorm';
import { McpIntegrationRecord } from '../mcp/infrastructure/persistence/postgres/schema/mcp-integration.record';

// Use Cases
import { CreateAgentUseCase } from './application/use-cases/create-agent/create-agent.use-case';
import { FindOneAgentUseCase } from './application/use-cases/find-one-agent/find-one-agent.use-case';
import { FindManyAgentsUseCase } from './application/use-cases/find-many-agents/find-many-agents.use-case';
import { FindAllAgentsByOwnerUseCase } from './application/use-cases/find-all-agents-by-owner/find-all-agents-by-owner.use-case';
import { DeleteAgentUseCase } from './application/use-cases/delete-agent/delete-agent.use-case';
import { UpdateAgentUseCase } from './application/use-cases/update-agent/update-agent.use-case';
import { ReplaceModelWithUserDefaultUseCase } from './application/use-cases/replace-model-with-user-default/replace-model-with-user-default.use-case';
import { AddSourceToAgentUseCase } from './application/use-cases/add-source-to-agent/add-source-to-agent.use-case';
import { RemoveSourceFromAgentUseCase } from './application/use-cases/remove-source-from-agent/remove-source-from-agent.use-case';
import { AssignMcpIntegrationToAgentUseCase } from './application/use-cases/assign-mcp-integration-to-agent/assign-mcp-integration-to-agent.use-case';
import { UnassignMcpIntegrationFromAgentUseCase } from './application/use-cases/unassign-mcp-integration-from-agent/unassign-mcp-integration-from-agent.use-case';
import { ListAgentMcpIntegrationsUseCase } from './application/use-cases/list-agent-mcp-integrations/list-agent-mcp-integrations.use-case';
import { ListAvailableMcpIntegrationsUseCase } from '../mcp/application/use-cases/list-available-mcp-integrations/list-available-mcp-integrations.use-case';

// Strategies
import { AgentShareAuthorizationStrategy } from './application/strategies/agent-share-authorization.strategy';

// Presenters
import { AgentsController } from './presenters/http/agents.controller';
import { AgentDtoMapper } from './presenters/http/mappers/agent.mapper';
import { AgentSourceDtoMapper } from './presenters/http/mappers/agent-source.mapper';
import { ThreadsModule } from '../threads/threads.module';
import { McpIntegrationDtoMapper } from '../mcp/presenters/http/mappers/mcp-integration-dto.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgentRecord,
      AgentSourceAssignmentRecord,
      McpIntegrationRecord,
    ]),
    LocalAgentsRepositoryModule,
    forwardRef(() => ModelsModule),
    forwardRef(() => ThreadsModule),
    SourcesModule,
    ToolsModule,
    McpModule,
  ],
  providers: [
    {
      provide: AgentRepository,
      useClass: LocalAgentRepository,
    },
    // Use Cases
    CreateAgentUseCase,
    FindOneAgentUseCase,
    FindManyAgentsUseCase,
    FindAllAgentsByOwnerUseCase,
    UpdateAgentUseCase,
    DeleteAgentUseCase,
    ReplaceModelWithUserDefaultUseCase,
    AddSourceToAgentUseCase,
    RemoveSourceFromAgentUseCase,
    AssignMcpIntegrationToAgentUseCase,
    UnassignMcpIntegrationFromAgentUseCase,
    ListAgentMcpIntegrationsUseCase,
    ListAvailableMcpIntegrationsUseCase,

    // Strategies
    AgentShareAuthorizationStrategy,

    // Presenters
    AgentDtoMapper,
    AgentSourceDtoMapper,
    McpIntegrationDtoMapper,
  ],
  controllers: [AgentsController],
  exports: [
    CreateAgentUseCase,
    FindOneAgentUseCase,
    FindManyAgentsUseCase,
    FindAllAgentsByOwnerUseCase,
    UpdateAgentUseCase,
    DeleteAgentUseCase,
    ReplaceModelWithUserDefaultUseCase,
    AddSourceToAgentUseCase,
    RemoveSourceFromAgentUseCase,
    AssignMcpIntegrationToAgentUseCase,
    UnassignMcpIntegrationFromAgentUseCase,
    // Export strategy for shares module to use
    AgentShareAuthorizationStrategy,
  ],
})
export class AgentsModule {}
