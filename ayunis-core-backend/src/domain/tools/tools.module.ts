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
import { ActivateSkillToolHandler } from './application/handlers/activate-skill-tool.handler';
import { KnowledgeQueryToolHandler } from './application/handlers/knowledge-query-tool.handler';
import { KnowledgeGetTextToolHandler } from './application/handlers/knowledge-get-text-tool.handler';
import { CreateDocumentToolHandler } from './application/handlers/create-document-tool.handler';
import { UpdateDocumentToolHandler } from './application/handlers/update-document-tool.handler';
import { EditDocumentToolHandler } from './application/handlers/edit-document-tool.handler';
import { ReadDocumentToolHandler } from './application/handlers/read-document-tool.handler';
import { CreateDiagramToolHandler } from './application/handlers/create-diagram-tool.handler';
import { UpdateDiagramToolHandler } from './application/handlers/update-diagram-tool.handler';
import { SkillsModule } from '../skills/skills.module';
import { KnowledgeBasesModule } from '../knowledge-bases/knowledge-bases.module';
import { SkillTemplatesModule } from '../skill-templates/skill-templates.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { GenerateImageToolHandler } from './application/handlers/generate-image-tool.handler';
import { ModelsModule } from '../models/models.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [
    SourcesModule,
    forwardRef(() => ThreadsModule),
    forwardRef(() => ModelsModule),
    LocalToolConfigRepositoryModule,
    RetrieverModule,
    McpModule,
    SkillsModule,
    KnowledgeBasesModule,
    SkillTemplatesModule,
    ArtifactsModule,
    UsageModule,
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
    ActivateSkillToolHandler,
    KnowledgeQueryToolHandler,
    KnowledgeGetTextToolHandler,
    CreateDocumentToolHandler,
    UpdateDocumentToolHandler,
    EditDocumentToolHandler,
    ReadDocumentToolHandler,
    GenerateImageToolHandler,
    CreateDiagramToolHandler,
    UpdateDiagramToolHandler,
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
