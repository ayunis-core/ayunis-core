import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './presenters/http/app.controller';
import { ModelsModule } from 'src/domain/models/models.module';
import { SkillsModule } from 'src/domain/skills/skills.module';
import { MessagesModule } from 'src/domain/messages/messages.module';
import { ToolsModule } from 'src/domain/tools/tools.module';
import { ThreadsModule } from 'src/domain/threads/threads.module';
import { RunsModule } from 'src/domain/runs/runs.module';
import { SplitterModule } from 'src/domain/rag/splitters/splitter.module';
import { EmbeddingsModule } from 'src/domain/rag/embeddings/embeddings.module';
import { RetrieverModule } from 'src/domain/retrievers/retriever.module';
import { SourcesModule } from 'src/domain/sources/sources.module';
import { StorageModule } from 'src/domain/storage/storage.module';
import { SharesModule } from 'src/domain/shares/shares.module';
import { McpModule } from 'src/domain/mcp/mcp.module';
import { MarketplaceModule } from 'src/domain/marketplace/marketplace.module';
import { UsageModule } from 'src/domain/usage/usage.module';
import { TranscriptionsModule } from 'src/domain/transcriptions/transcriptions.module';
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
import { IamModule } from 'src/iam/iam.module';

import { AuthProvider } from 'src/config/authentication.config';
import { rootConfigs } from 'src/config/root-configs';
import { validateEnv } from 'src/config/env.validation';
import { CookieParserMiddleware } from 'src/common/middleware/cookie-parser.middleware';
import dataSource from 'src/db/datasource';
import { SecurityHeadersMiddleware } from 'src/common/middleware/security-headers.middleware';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import type { RedisConfig } from 'src/config/redis.config';
import { BullModule } from '@nestjs/bullmq';
import { IsCloudUseCase } from './application/use-cases/is-cloud/is-cloud.use-case';
import { IsRegistrationDisabledUseCase } from './application/use-cases/is-registration-disabled/is-registration-disabled.use-case';
import { GetFrontendRuntimeConfigUseCase } from './application/use-cases/get-frontend-runtime-config/get-frontend-runtime-config.use-case';
import { ClsModule } from 'nestjs-cls';
import { ContextModule } from 'src/common/context/context.module';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { ApplicationErrorFilter } from 'src/common/filters/application-error.filter';
import { PayloadTooLargeExceptionFilter } from 'src/common/filters/payload-too-large.filter';
import { IntegrationsModule } from 'src/integrations/integrations.module';
import { LoggingModule } from 'src/common/logger/logging.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: rootConfigs,
      validate: validateEnv,
    }),
    LoggingModule,
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
      plugins: [
        new ClsPluginTransactional({
          imports: [
            // module in which the database instance is provided
            TypeOrmModule,
          ],
          adapter: new TransactionalAdapterTypeOrm({
            // the injection token of the database instance
            dataSourceToken: getDataSourceToken(),
          }),
        }),
      ],
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend'),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get('typeorm')!,
      dataSourceFactory: async () => {
        // Vector type hack is now applied in the datasource itself
        // Initialize datasource
        await dataSource.initialize();

        return dataSource;
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = configService.get<RedisConfig>('redis')!;
        return {
          connection: {
            host: redis.host,
            port: redis.port,
            password: redis.password,
            // Note: maxRetriesPerRequest is intentionally omitted — BullMQ
            // forces it to null internally because it uses blocking Redis
            // commands (BRPOPLPUSH/BLMOVE) that must wait indefinitely.
            connectTimeout: 5000,
          },
        };
      },
    }),
    EventEmitterModule.forRoot(),
    IntegrationsModule,
    ContextModule, // Global
    ModelsModule,
    SkillsModule,
    MessagesModule,
    ToolsModule,
    ThreadsModule,
    RunsModule,
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
    IamModule.register({
      authProvider:
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- env var may be undefined at runtime despite type cast
        (process.env.AUTH_PROVIDER as AuthProvider) || AuthProvider.LOCAL,
    }),
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
    IsCloudUseCase,
    IsRegistrationDisabledUseCase,
    GetFrontendRuntimeConfigUseCase,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CookieParserMiddleware, SecurityHeadersMiddleware)
      .forRoutes('*');
  }
}
