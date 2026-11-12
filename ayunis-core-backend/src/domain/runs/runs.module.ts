import { forwardRef, Module } from '@nestjs/common';
import { ModelsModule } from 'src/domain/models/models.module';
import { ToolsModule } from 'src/domain/tools/tools.module';
import { MessagesModule } from 'src/domain/messages/messages.module';
import { ThreadsModule } from 'src/domain/threads/threads.module';
import { RunsController } from './presenters/http/runs.controller';
import { ThreadAiContextController } from './presenters/http/thread-ai-context.controller';
import { ActiveRunsController } from './presenters/http/active-runs.controller';
import { ActiveThreadRuns } from './application/services/active-thread-runs.service';
import { FindActiveThreadRunsUseCase } from './application/use-cases/find-active-thread-runs/find-active-thread-runs.use-case';
import { AttachToThreadRunUseCase } from './application/use-cases/attach-to-thread-run/attach-to-thread-run.use-case';
import { CancelThreadRunUseCase } from './application/use-cases/cancel-thread-run/cancel-thread-run.use-case';
import { CancelRunsOnThreadDeletionListener } from './application/listeners/cancel-runs-on-thread-deletion.listener';
import { ExecuteRunUseCase } from './application/use-cases/execute-run/execute-run.use-case';
import { ExecuteRunAndSetTitleUseCase } from './application/use-cases/execute-run-and-set-title/execute-run-and-set-title.use-case';
import { SendMessageUseCase } from './application/use-cases/send-message/send-message.use-case';
import { GetThreadAiContextUseCase } from './application/use-cases/get-thread-ai-context/get-thread-ai-context.use-case';
import { RunEventResponseMapper } from './presenters/http/mappers/run-event-response.mapper';
import { ThreadAiContextResponseMapper } from './presenters/http/mappers/thread-ai-context-response.mapper';
import { SourceCitationResponseMapper } from './presenters/http/mappers/source-citation-response.mapper';
import { RunSsePresenter } from './presenters/http/sse/run-sse.presenter';
import { SendMessageRequestValidator } from './presenters/http/validation/send-message-request.validator';
import { BackendToolAdapter } from './application/agent-runtime/backend-tool.adapter';
import { PersistenceHookFactory } from './application/agent-runtime/hooks/persistence-hook.factory';
import { UsageHookFactory } from './application/agent-runtime/hooks/usage-hook.factory';
import { CreditGateHookFactory } from './application/agent-runtime/hooks/credit-gate-hook.factory';
import { ToolUsageHookFactory } from './application/agent-runtime/hooks/tool-usage-hook.factory';
import { ContextBudgetHookFactory } from './application/agent-runtime/hooks/context-budget-hook.factory';
import { ModelCallObservabilityHookFactory } from './application/agent-runtime/hooks/model-call-observability-hook.factory';
import { RuntimeHistoryMaterializer } from './application/agent-runtime/runtime-history-materializer';
import { RunAssemblyService } from './application/services/run-assembly.service';
import { ArtifactToolAssemblerService } from './application/services/artifact-tool-assembler.service';
import { McpToolAssemblerService } from './application/services/mcp-tool-assembler.service';
import { ToolResultCollectorService } from './application/services/tool-result-collector.service';
import { MessageCleanupService } from './application/services/message-cleanup.service';
import { ThreadRunLock } from './application/services/thread-run-lock.service';
import { RunTelemetryService } from './application/services/run-telemetry.service';
import { EffectiveRunModelResolverService } from './application/services/effective-run-model-resolver.service';
import { UnmaskedTermsService } from './application/services/unmasked-terms.service';
import { AnonymizationCapability } from './application/run-capabilities/capabilities/anonymization.capability';
import { ArtifactsCapability } from './application/run-capabilities/capabilities/artifacts.capability';
import { BehaviorCapability } from './application/run-capabilities/capabilities/behavior.capability';
import { CodeExecutionCapability } from './application/run-capabilities/capabilities/code-execution.capability';
import { CustomInstructionsCapability } from './application/run-capabilities/capabilities/custom-instructions.capability';
import { DataHandlingCapability } from './application/run-capabilities/capabilities/data-handling.capability';
import { DateTimeCapability } from './application/run-capabilities/capabilities/date-time.capability';
import { EmailCalendarCapability } from './application/run-capabilities/capabilities/email-calendar.capability';
import { FilesChartsMapCapability } from './application/run-capabilities/capabilities/files-charts-map.capability';
import { ImageGenerationCapability } from './application/run-capabilities/capabilities/image-generation.capability';
import { InternetCapability } from './application/run-capabilities/capabilities/internet.capability';
import { KnowledgeBasesCapability } from './application/run-capabilities/capabilities/knowledge-bases.capability';
import { RecordingsCapability } from './application/run-capabilities/capabilities/recordings.capability';
import { LegalReferencesCapability } from './application/run-capabilities/capabilities/legal-references.capability';
import { MarketplaceCapability } from './application/run-capabilities/capabilities/marketplace.capability';
import { McpCapability } from './application/run-capabilities/capabilities/mcp.capability';
import { SkillsCapability } from './application/run-capabilities/capabilities/skills.capability';
import { RoutinesCapability } from './application/run-capabilities/capabilities/routines.capability';
import { ThreadSourcesCapability } from './application/run-capabilities/capabilities/thread-sources.capability';
import { WorkspaceInstructionsCapability } from './application/run-capabilities/capabilities/workspace-instructions.capability';
import { RunCapabilityContextFactory } from './application/run-capabilities/run-capability-context.factory';
import { FinishRoutineCapability } from './application/run-capabilities/capabilities/finish-routine.capability';
import { NotificationsCapability } from './application/run-capabilities/capabilities/notifications.capability';
import { NotificationContextCapability } from './application/run-capabilities/capabilities/notification-context.capability';
import { NotificationsModule } from 'src/domain/notifications/notifications.module';
import { RoutineContextCapability } from './application/run-capabilities/capabilities/routine-context.capability';
import { RoutineInternetCapability } from './application/run-capabilities/capabilities/routine-internet.capability';
import { ChatRunProfile } from './application/run-profiles/chat-run-profile';
import { RoutineRunProfile } from './application/run-profiles/routine-run-profile';
import { ExecuteUnattendedRunUseCase } from './application/use-cases/execute-unattended-run/execute-unattended-run.use-case';
import { RunProfileAssembler } from './application/run-profiles/run-profile-assembler.service';
import { RunProfileRegistry } from './application/run-profiles/run-profile.registry';

import { TrialsModule } from 'src/iam/trials/trials.module';
import { McpModule } from 'src/domain/mcp/mcp.module';
import { SourcesModule } from 'src/domain/sources/sources.module';
import { AnonymizationSettingsModule } from 'src/domain/anonymization-settings/anonymization-settings.module';
import { ThreadPiiMasksModule } from 'src/domain/thread-pii-masks/thread-pii-masks.module';
import { UsageModule } from 'src/domain/usage/usage.module';
import { QuotasModule } from 'src/iam/quotas/quotas.module';
import { SkillsModule } from 'src/domain/skills/skills.module';
import { SkillTemplatesModule } from 'src/domain/skill-templates/skill-templates.module';
import { ChatSettingsModule } from 'src/domain/chat-settings/chat-settings.module';
import { ArtifactsModule } from 'src/domain/artifacts/artifacts.module';
import { LetterheadsModule } from 'src/domain/letterheads/letterheads.module';
import { WorkspacesModule } from 'src/domain/workspaces/workspaces.module';
import { KnowledgeBasesModule } from 'src/domain/knowledge-bases/knowledge-bases.module';
import { RecordingsModule } from 'src/domain/recordings/recordings.module';
import { RoutinesModule } from 'src/domain/routines/routines.module';
import { GetThreadSourceCitationUseCase } from './application/use-cases/get-thread-source-citation/get-thread-source-citation.use-case';
import { ThreadSourceCitationsController } from './presenters/http/thread-source-citations.controller';

@Module({
  imports: [
    ModelsModule,
    ThreadsModule,
    MessagesModule,
    ToolsModule,
    TrialsModule,
    McpModule,
    SourcesModule,
    AnonymizationSettingsModule,
    ThreadPiiMasksModule,
    UsageModule,
    QuotasModule,
    SkillsModule,
    SkillTemplatesModule,
    ChatSettingsModule,
    ArtifactsModule,
    LetterheadsModule,
    WorkspacesModule,
    KnowledgeBasesModule,
    RecordingsModule,
    NotificationsModule,
    forwardRef(() => RoutinesModule), // Runs → Routines → Runs (circular)
  ],
  controllers: [
    RunsController,
    ActiveRunsController,
    ThreadAiContextController,
    ThreadSourceCitationsController,
  ],
  providers: [
    ExecuteRunUseCase,
    GetThreadAiContextUseCase,
    GetThreadSourceCitationUseCase,
    BackendToolAdapter,
    PersistenceHookFactory,
    CreditGateHookFactory,
    UsageHookFactory,
    ToolUsageHookFactory,
    ContextBudgetHookFactory,
    RuntimeHistoryMaterializer,
    RunAssemblyService,
    ModelCallObservabilityHookFactory,
    ExecuteRunAndSetTitleUseCase,
    SendMessageUseCase,
    RunEventResponseMapper,
    ThreadAiContextResponseMapper,
    SourceCitationResponseMapper,
    RunSsePresenter,
    SendMessageRequestValidator,
    ArtifactToolAssemblerService,
    McpToolAssemblerService,
    ToolResultCollectorService,
    MessageCleanupService,
    ThreadRunLock,
    ActiveThreadRuns,
    FindActiveThreadRunsUseCase,
    AttachToThreadRunUseCase,
    CancelThreadRunUseCase,
    CancelRunsOnThreadDeletionListener,
    RunTelemetryService,
    EffectiveRunModelResolverService,
    UnmaskedTermsService,
    RunProfileRegistry,
    RunProfileAssembler,
    RunCapabilityContextFactory,
    ChatRunProfile,
    RoutineRunProfile,
    AnonymizationCapability,
    ArtifactsCapability,
    BehaviorCapability,
    CodeExecutionCapability,
    CustomInstructionsCapability,
    DataHandlingCapability,
    DateTimeCapability,
    EmailCalendarCapability,
    FilesChartsMapCapability,
    ImageGenerationCapability,
    InternetCapability,
    KnowledgeBasesCapability,
    RecordingsCapability,
    LegalReferencesCapability,
    MarketplaceCapability,
    McpCapability,
    SkillsCapability,
    RoutinesCapability,
    ThreadSourcesCapability,
    WorkspaceInstructionsCapability,
    NotificationContextCapability,
    RoutineContextCapability,
    RoutineInternetCapability,
    NotificationsCapability,
    FinishRoutineCapability,
    ExecuteUnattendedRunUseCase,
  ],
  exports: [
    ExecuteRunUseCase,
    ExecuteRunAndSetTitleUseCase,
    ExecuteUnattendedRunUseCase,
  ],
})
export class RunsModule {}
