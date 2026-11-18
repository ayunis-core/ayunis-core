import { BaseModule } from './base.module';
import { ConditionalModule } from '@nestjs/config';
import { ingestionInApi } from 'src/config/ingestion.config';
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { SubscriptionSyncModule } from 'src/integrations/core-connect/subscription-sync/subscription-sync.module';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './presenters/http/app.controller';
import { ModelsModule } from 'src/domain/models/models.module';
import { SkillsModule } from 'src/domain/skills/skills.module';
import { MessagesModule } from 'src/domain/messages/messages.module';
import { ToolsModule } from 'src/domain/tools/tools.module';
import { ThreadsModule } from 'src/domain/threads/threads.module';
import { RunsModule } from 'src/domain/runs/runs.module';
import { RoutinesModule } from 'src/domain/routines/routines.module';
import { RecordingsModule } from 'src/domain/recordings/recordings.module';
import { NotificationsModule } from 'src/domain/notifications/notifications.module';
import { ReleaseNotesModule } from 'src/domain/release-notes/release-notes.module';
import { SplitterModule } from 'src/domain/rag/splitters/splitter.module';
import { EmbeddingsModule } from 'src/domain/rag/embeddings/embeddings.module';
import { RetrieverModule } from 'src/domain/retrievers/retriever.module';
import { SourcesModule } from 'src/domain/sources/sources.module';
// Loaded after SourcesModule: the Models ↔ Sources import cycle resolves only
// when ModelsModule is the first of the two to be evaluated.
import { IngestionConsumersModule } from './ingestion-consumers.module';
import { StorageModule } from 'src/domain/storage/storage.module';
import { SharesModule } from 'src/domain/shares/shares.module';
import { McpModule } from 'src/domain/mcp/mcp.module';
import { MarketplaceModule } from 'src/domain/marketplace/marketplace.module';
import { UsageModule } from 'src/domain/usage/usage.module';
import { TranscriptionsModule } from 'src/domain/transcriptions/transcriptions.module';
import { SpeechModule } from 'src/domain/speech/speech.module';
import { ChatSettingsModule } from 'src/domain/chat-settings/chat-settings.module';
import { AnonymizationSettingsModule } from 'src/domain/anonymization-settings/anonymization-settings.module';
import { RetentionPoliciesModule } from 'src/domain/retention-policies/retention-policies.module';
import { KnowledgeBasesModule } from 'src/domain/knowledge-bases/knowledge-bases.module';
import { CrawlDomainGrantsModule } from 'src/domain/crawl-domain-grants/crawl-domain-grants.module';
import { SkillTemplatesModule } from 'src/domain/skill-templates/skill-templates.module';
import { AcademyModule } from 'src/domain/academy/academy.module';
import { ArtifactsModule } from 'src/domain/artifacts/artifacts.module';
import { LetterheadsModule } from 'src/domain/letterheads/letterheads.module';
import { FavoritesModule } from 'src/domain/favorites/favorites.module';
import { WorkspacesModule } from 'src/domain/workspaces/workspaces.module';
import { OpenAICompatModule } from 'src/domain/openai-compat/openai-compat.module';
import { OfficeAddinsModule } from 'src/domain/office-addins/office-addins.module';
import { IamModule } from 'src/iam/iam.module';

import { AuthProvider } from 'src/config/authentication.config';
import { CookieParserMiddleware } from 'src/common/middleware/cookie-parser.middleware';
import { SecurityHeadersMiddleware } from 'src/common/middleware/security-headers.middleware';
import { AppsignalNamespaceMiddleware } from 'src/common/middleware/appsignal-namespace.middleware';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { serveFrontendOptions } from './presenters/http/serve-frontend.options';
import { IsCloudUseCase } from './application/use-cases/is-cloud/is-cloud.use-case';
import { IsRegistrationDisabledUseCase } from './application/use-cases/is-registration-disabled/is-registration-disabled.use-case';
import { GetFrontendRuntimeConfigUseCase } from './application/use-cases/get-frontend-runtime-config/get-frontend-runtime-config.use-case';
import { ContextModule } from 'src/common/context/context.module';
import { ApplicationErrorFilter } from 'src/common/filters/application-error.filter';
import { PayloadTooLargeExceptionFilter } from 'src/common/filters/payload-too-large.filter';
import { IntegrationsModule } from 'src/integrations/integrations.module';
import { QueueInspectionModule } from 'src/integrations/queue-inspection/queue-inspection.module';
import { QueueTelemetryModule } from 'src/integrations/queue-telemetry/queue-telemetry.module';

@Module({
  imports: [
    BaseModule.forApi(),
    // The API works through the ingestion queues itself unless a separate
    // worker does (INGESTION_IN_API=false).
    ConditionalModule.registerWhen(IngestionConsumersModule, (env) =>
      ingestionInApi(env),
    ),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot(
      serveFrontendOptions(join(__dirname, '..', '..', 'frontend')),
    ),
    IntegrationsModule,
    ContextModule, // Global
    ModelsModule,
    SkillsModule,
    MessagesModule,
    ToolsModule,
    ThreadsModule,
    RunsModule,
    RoutinesModule,
    RecordingsModule,
    NotificationsModule,
    ReleaseNotesModule,
    SplitterModule,
    EmbeddingsModule,
    RetrieverModule,
    SourcesModule,
    StorageModule,
    SharesModule,
    McpModule,
    MarketplaceModule,
    UsageModule,
    TranscriptionsModule,
    SpeechModule,
    ChatSettingsModule,
    AnonymizationSettingsModule,
    RetentionPoliciesModule,
    KnowledgeBasesModule,
    CrawlDomainGrantsModule,
    SkillTemplatesModule,
    AcademyModule,
    ArtifactsModule,
    LetterheadsModule,
    FavoritesModule,
    WorkspacesModule,
    OpenAICompatModule,
    OfficeAddinsModule,
    IamModule.register({
      authProvider:
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- env var may be undefined at runtime despite type cast
        (process.env.AUTH_PROVIDER as AuthProvider) || AuthProvider.LOCAL,
    }),
    // Keep IAM first so adding internal sync does not reorder public OpenAPI endpoints.
    SubscriptionSyncModule,
    QueueInspectionModule,
    QueueTelemetryModule,
  ],
  controllers: [AppController],
  providers: [
    // ApplicationErrorFilter is the single catch-all filter.
    // - ApplicationErrors → proper HTTP status via toHttpException()
    // - Everything else   → NestJS BaseExceptionFilter defaults
    // Unexpected (5xx) errors are reported to AppSignal inside catch();
    // 4xx errors are expected client errors and are never reported.
    {
      provide: APP_FILTER,
      useClass: PayloadTooLargeExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ApplicationErrorFilter,
    },
    CookieParserMiddleware,
    SecurityHeadersMiddleware,
    AppsignalNamespaceMiddleware,
    IsCloudUseCase,
    IsRegistrationDisabledUseCase,
    GetFrontendRuntimeConfigUseCase,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        AppsignalNamespaceMiddleware,
        CookieParserMiddleware,
        SecurityHeadersMiddleware,
      )
      .forRoutes('*');
  }
}
