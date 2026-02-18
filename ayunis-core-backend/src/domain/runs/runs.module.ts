import { Module } from '@nestjs/common';
import { ModelsModule } from 'src/domain/models/models.module';
import { ToolsModule } from 'src/domain/tools/tools.module';
import { MessagesModule } from 'src/domain/messages/messages.module';
import { ThreadsModule } from 'src/domain/threads/threads.module';
import { RunsController } from './presenters/http/runs.controller';
import { AgentsModule } from 'src/domain/agents/agents.module';
import { ExecuteRunUseCase } from './application/use-cases/execute-run/execute-run.use-case';
import { ExecuteRunAndSetTitleUseCase } from './application/use-cases/execute-run-and-set-title/execute-run-and-set-title.use-case';
import { SystemPromptBuilderService } from './application/services/system-prompt-builder.service';
import { ToolAssemblyService } from './application/services/tool-assembly.service';
import { ToolResultCollectorService } from './application/services/tool-result-collector.service';
import { MessageCleanupService } from './application/services/message-cleanup.service';
import { StreamingInferenceService } from './application/services/streaming-inference.service';
import { SubscriptionsModule } from 'src/iam/subscriptions/subscriptions.module';
import { TrialsModule } from 'src/iam/trials/trials.module';
import { McpModule } from 'src/domain/mcp/mcp.module';
import { SourcesModule } from 'src/domain/sources/sources.module';
import { AnonymizationModule } from 'src/common/anonymization/anonymization.module';
import { UsageModule } from 'src/domain/usage/usage.module';
import { QuotasModule } from 'src/iam/quotas/quotas.module';
import { SkillsModule } from 'src/domain/skills/skills.module';
import { ChatSettingsModule } from 'src/domain/chat-settings/chat-settings.module';
import { ArtifactsModule } from 'src/domain/artifacts/artifacts.module';

@Module({
  imports: [
    ModelsModule,
    ThreadsModule,
    MessagesModule,
    ToolsModule,
    AgentsModule,
    SubscriptionsModule,
    TrialsModule,
    McpModule,
    SourcesModule,
    AnonymizationModule,
    UsageModule,
    QuotasModule,
    SkillsModule,
    ChatSettingsModule,
    ArtifactsModule,
  ],
  controllers: [RunsController],
  providers: [
    ExecuteRunUseCase,
    ExecuteRunAndSetTitleUseCase,
    SystemPromptBuilderService,
    ToolAssemblyService,
    ToolResultCollectorService,
    MessageCleanupService,
    StreamingInferenceService,
  ],
  exports: [ExecuteRunUseCase, ExecuteRunAndSetTitleUseCase],
})
export class RunsModule {}
