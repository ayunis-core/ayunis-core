import { Module } from '@nestjs/common';
import { ToolHandlerRegistry } from './application/tool-handler.registry';
import { HttpToolHandler } from './application/handlers/http-tool.handler';
import { SourceQueryToolHandler } from './application/handlers/source-query-tool.handler';
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

@Module({
  imports: [SourcesModule, LocalToolConfigRepositoryModule, RetrieverModule],
  providers: [
    // Use cases
    AssembleToolUseCase,
    ExecuteToolUseCase,
    CheckToolCapabilitiesUseCase,
    // Core services and registries
    ToolHandlerRegistry,
    HttpToolHandler,
    SourceQueryToolHandler,
    InternetSearchToolHandler,
    WebsiteContentToolHandler,

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
