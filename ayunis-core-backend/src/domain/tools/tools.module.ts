import { forwardRef, Module } from '@nestjs/common';
import { ToolHandlerRegistry } from './application/tool-handler.registry';
import {
  TOOL_HANDLER_ENTRIES_PROVIDER,
  TOOL_HANDLER_PROVIDERS,
} from './application/tool-handlers.registration';
import { ToolConfigRepository } from './application/ports/tool-config.repository';
import { LocalToolConfigRepository } from './infrastructure/persistence/local/local-tool-config.repository';
import { ToolFactory } from './application/tool.factory';
import { SourcesModule } from '../sources/sources.module';
import { LocalToolConfigRepositoryModule } from './infrastructure/persistence/local/local-tool-config-repository.module';
import { RetrieverModule } from '../retrievers/retriever.module';
import { ToolConfigMapper } from './infrastructure/persistence/local/mappers/tool-config.mapper';
import { AssembleToolUseCase } from './application/use-cases/assemble-tool/assemble-tool.use-case';
import { ExecuteToolUseCase } from './application/use-cases/execute-tool/execute-tool.use-case';
import { CheckToolCapabilitiesUseCase } from './application/use-cases/check-tool-capabilities/check-tool-capabilities.use-case';
import { ThreadsModule } from '../threads/threads.module';
import { McpModule } from '../mcp/mcp.module';
import { SkillsModule } from '../skills/skills.module';
import { KnowledgeBasesModule } from '../knowledge-bases/knowledge-bases.module';
import { SkillTemplatesModule } from '../skill-templates/skill-templates.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';
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
    AssembleToolUseCase,
    ExecuteToolUseCase,
    CheckToolCapabilitiesUseCase,
    ToolHandlerRegistry,
    ...TOOL_HANDLER_PROVIDERS,
    TOOL_HANDLER_ENTRIES_PROVIDER,
    {
      provide: ToolConfigRepository,
      useExisting: LocalToolConfigRepository,
    },
    {
      provide: ToolFactory,
      useClass: ToolFactory,
    },
    ToolConfigMapper,
  ],
  exports: [
    AssembleToolUseCase,
    ExecuteToolUseCase,
    CheckToolCapabilitiesUseCase,
    ToolHandlerRegistry,
    ToolFactory,
    ToolConfigMapper,
  ],
  controllers: [],
})
export class ToolsModule {}
