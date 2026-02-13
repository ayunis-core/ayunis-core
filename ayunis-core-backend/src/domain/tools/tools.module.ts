import { forwardRef, Module } from '@nestjs/common';
import { ToolHandlerRegistry } from './application/tool-handler.registry';
import { HttpToolHandler } from './application/handlers/http-tool.handler';
import { SourceQueryToolHandler } from './application/handlers/source-query-tool.handler';
import { SourceGetTextToolHandler } from './application/handlers/source-get-text-tool.handler';
import { ToolConfigRepository } from './application/ports/tool-config.repository';
import { LocalToolConfigRepository } from './infrastructure/persistence/local/local-tool-config.repository';
import { ToolFactory } from './application/tool.factory';
import { SourcesModule } from '../sources/sources.module';
import { LocalToolConfigRepositoryModule } from './infrastructure/persistence/local/local-tool-config-repository.module';
import { InternetSearchToolHandler } from './application/handlers/internet-search-tool.handler';
import { WebsiteContentToolHandler } from './application/handlers/website-content-tool.handler';
import { RetrieverModule } from '../retrievers/retriever.module';
import { ToolConfigMapper } from './infrastructure/persistence/local/mappers/tool-config.mapper';
import { AssembleToolUseCase } from './application/use-cases/assemble-tool/assemble-tool.use-case';
import { ExecuteToolUseCase } from './application/use-cases/execute-tool/execute-tool.use-case';
import { CheckToolCapabilitiesUseCase } from './application/use-cases/check-tool-capabilities/check-tool-capabilities.use-case';
import { CodeExecutionToolHandler } from './application/handlers/code-execution-tool.handler';
import { ThreadsModule } from '../threads/threads.module';
import { McpModule } from '../mcp/mcp.module';
import { McpIntegrationToolHandler } from './application/handlers/mcp-integration-tool.handler';
import { McpIntegrationResourceHandler } from './application/handlers/mcp-integration-resource.handler';
import { ProductKnowledgeToolHandler } from './application/handlers/product-knowledge-tool.handler';
import { ProductKnowledgePort } from './application/ports/product-knowledge.port';
import { ProductKnowledgeAdapter } from './infrastructure/product-knowledge/product-knowledge.adapter';
import { ActivateSkillToolHandler } from './application/handlers/activate-skill-tool.handler';
import { SkillsModule } from '../skills/skills.module';

@Module({
  imports: [
    SourcesModule,
    forwardRef(() => ThreadsModule),
    LocalToolConfigRepositoryModule,
    RetrieverModule,
    McpModule,
    SkillsModule,
  ],
  providers: [
    // Use cases
    AssembleToolUseCase,
    ExecuteToolUseCase,
    CheckToolCapabilitiesUseCase,
    // Core services and registries
    ToolHandlerRegistry,
    HttpToolHandler,
    SourceQueryToolHandler,
    SourceGetTextToolHandler,
    InternetSearchToolHandler,
    WebsiteContentToolHandler,
    CodeExecutionToolHandler,
    McpIntegrationToolHandler,
    McpIntegrationResourceHandler,
    ProductKnowledgeToolHandler,
    ActivateSkillToolHandler,
    {
      provide: ProductKnowledgePort,
      useClass: ProductKnowledgeAdapter,
    },
    // Repositories and factories
    {
      provide: ToolConfigRepository,
      useExisting: LocalToolConfigRepository,
    },
    {
      provide: ToolFactory,
      useClass: ToolFactory,
    },

    // Mappers
    ToolConfigMapper,
  ],
  exports: [
    // Export use cases
    AssembleToolUseCase,
    ExecuteToolUseCase,
    CheckToolCapabilitiesUseCase,
    // Export core services
    ToolHandlerRegistry,
    ToolFactory,

    // Export mappers
    ToolConfigMapper,
  ],
  controllers: [],
})
export class ToolsModule {}
