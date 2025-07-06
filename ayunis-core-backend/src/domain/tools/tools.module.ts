import { Module } from '@nestjs/common';
import { ToolsController } from './presenters/http/tools.controller';
import { ToolHandlerRegistry } from './application/tool-handler.registry';
import { HttpToolHandler } from './application/handlers/http-tool.handler';
import { SourceQueryToolHandler } from './application/handlers/source-query-tool.handler';
import { ModelsModule } from '../models/models.module';
import { ToolConfigRepository } from './application/ports/tool-config.repository';
import { LocalToolConfigRepository } from './infrastructure/persistence/local/local-tool-config.repository';
import { ToolFactory } from './application/tool.factory';
import { SourcesModule } from '../sources/sources.module';
import { LocalToolConfigModule } from './infrastructure/persistence/local/local-tool-config.module';
import { InternetSearchToolHandler } from './application/handlers/internet-search-tool.handler';
import { WebsiteContentToolHandler } from './application/handlers/website-content-tool.handler';
import { RetrieverModule } from '../retrievers/retriever.module';

// Import all use cases
import { CreateToolUseCase } from './application/use-cases/create-tool/create-tool.use-case';
import { FindOneToolUseCase } from './application/use-cases/find-one-tool/find-one-tool.use-case';
import { FindAllUserToolsUseCase } from './application/use-cases/find-all-user-tools/find-all-user-tools.use-case';
import { FindManyToolsUseCase } from './application/use-cases/find-many-tools/find-many-tools.use-case';
import { FindContextualToolsUseCase } from './application/use-cases/find-contextual-tools/find-contextual-tools.use-case';
import { ExecuteToolUseCase } from './application/use-cases/execute-tool/execute-tool.use-case';
import { DeleteToolUseCase } from './application/use-cases/delete-tool/delete-tool.use-case';
import { CheckToolCapabilitiesUseCase } from './application/use-cases/check-tool-capabilities/check-tool-capabilities.use-case';

@Module({
  imports: [SourcesModule, LocalToolConfigModule, RetrieverModule],
  controllers: [ToolsController],
  providers: [
    // Use cases
    CreateToolUseCase,
    FindOneToolUseCase,
    FindAllUserToolsUseCase,
    FindManyToolsUseCase,
    FindContextualToolsUseCase,
    ExecuteToolUseCase,
    DeleteToolUseCase,
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
  ],
  exports: [
    // Export use cases
    CreateToolUseCase,
    FindOneToolUseCase,
    FindAllUserToolsUseCase,
    FindManyToolsUseCase,
    FindContextualToolsUseCase,
    ExecuteToolUseCase,
    DeleteToolUseCase,
    CheckToolCapabilitiesUseCase,

    // Export core services
    ToolHandlerRegistry,
    ToolFactory,
  ],
})
export class ToolsModule {}
