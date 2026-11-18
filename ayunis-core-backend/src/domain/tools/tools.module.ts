import { forwardRef, Module } from '@nestjs/common';
import { ToolHandlerRegistry } from './application/tool-handler.registry';
import {
  TOOL_HANDLER_ENTRIES_PROVIDER,
  TOOL_HANDLER_PROVIDERS,
} from './application/tool-handler.entries';
import { ToolConfigRepository } from './application/ports/tool-config.repository';
import { LocalToolConfigRepository } from './infrastructure/persistence/local/local-tool-config.repository';
import { ToolFactory } from './application/tool.factory';
import { SourcesModule } from 'src/domain/sources/sources.module';
import { LocalToolConfigRepositoryModule } from './infrastructure/persistence/local/local-tool-config-repository.module';
import { RetrieverModule } from 'src/domain/retrievers/retriever.module';
import { ToolConfigMapper } from './infrastructure/persistence/local/mappers/tool-config.mapper';
import { AssembleToolUseCase } from './application/use-cases/assemble-tool/assemble-tool.use-case';
import { ExecuteToolUseCase } from './application/use-cases/execute-tool/execute-tool.use-case';
import { ThreadsModule } from 'src/domain/threads/threads.module';
import { McpModule } from 'src/domain/mcp/mcp.module';
import { SkillsModule } from 'src/domain/skills/skills.module';
import { KnowledgeBasesModule } from 'src/domain/knowledge-bases/knowledge-bases.module';
import { RecordingsModule } from 'src/domain/recordings/recordings.module';
import { SkillTemplatesModule } from 'src/domain/skill-templates/skill-templates.module';
import { ArtifactsModule } from 'src/domain/artifacts/artifacts.module';
import { ModelsModule } from 'src/domain/models/models.module';
import { UsageModule } from 'src/domain/usage/usage.module';
import { QuotasModule } from 'src/iam/quotas/quotas.module';
import { MarketplaceModule } from 'src/domain/marketplace/marketplace.module';
import { AuthorizedCsvSourceResolverService } from 'src/domain/tools/application/services/authorized-csv-source-resolver.service';
import { McpFileHandoverService } from 'src/domain/tools/application/services/mcp-file-handover.service';
import { NotificationsModule } from 'src/domain/notifications/notifications.module';
import { MemoryModule } from 'src/domain/memory/memory.module';
import { ThreadPiiMasksModule } from 'src/domain/thread-pii-masks/thread-pii-masks.module';
import { AnonymizationSettingsModule } from 'src/domain/anonymization-settings/anonymization-settings.module';

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
    RecordingsModule,
    SkillTemplatesModule,
    ArtifactsModule,
    UsageModule,
    QuotasModule,
    MarketplaceModule,
    NotificationsModule,
    MemoryModule,
    ThreadPiiMasksModule,
    AnonymizationSettingsModule,
  ],
  providers: [
    // Use cases
    AssembleToolUseCase,
    ExecuteToolUseCase,
    // Core services and registries
    ToolHandlerRegistry,
    AuthorizedCsvSourceResolverService,
    McpFileHandoverService,
    ...TOOL_HANDLER_PROVIDERS,
    TOOL_HANDLER_ENTRIES_PROVIDER,
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
    // Export core services
    ToolHandlerRegistry,
    ToolFactory,

    // Export mappers
    ToolConfigMapper,
  ],
  controllers: [],
})
export class ToolsModule {}
