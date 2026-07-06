import { Module, Logger, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './presenters/http/app.controller';
import { ModelsModule } from '../domain/models/models.module';
import { SkillsModule } from '../domain/skills/skills.module';
import { MessagesModule } from '../domain/messages/messages.module';
import { ToolsModule } from '../domain/tools/tools.module';
import { ThreadsModule } from '../domain/threads/threads.module';
import { RunsModule } from '../domain/runs/runs.module';
import { SplitterModule } from '../domain/rag/splitters/splitter.module';
import { EmbeddingsModule } from '../domain/rag/embeddings/embeddings.module';
import { RetrieverModule } from '../domain/retrievers/retriever.module';
import { SourcesModule } from '../domain/sources/sources.module';
import { StorageModule } from '../domain/storage/storage.module';
import { SharesModule } from '../domain/shares/shares.module';
import { McpModule } from '../domain/mcp/mcp.module';
import { MarketplaceModule } from '../domain/marketplace/marketplace.module';
import { UsageModule } from '../domain/usage/usage.module';
import { TranscriptionsModule } from '../domain/transcriptions/transcriptions.module';
import { ChatSettingsModule } from '../domain/chat-settings/chat-settings.module';
import { AnonymizationSettingsModule } from '../domain/anonymization-settings/anonymization-settings.module';
import { RetentionPoliciesModule } from '../domain/retention-policies/retention-policies.module';
import { KnowledgeBasesModule } from '../domain/knowledge-bases/knowledge-bases.module';
import { CrawlDomainGrantsModule } from '../domain/crawl-domain-grants/crawl-domain-grants.module';
import { SkillTemplatesModule } from '../domain/skill-templates/skill-templates.module';
import { AcademyModule } from '../domain/academy/academy.module';
import { ArtifactsModule } from '../domain/artifacts/artifacts.module';
import { LetterheadsModule } from '../domain/letterheads/letterheads.module';
import { OpenAICompatModule } from '../domain/openai-compat/openai-compat.module';
import { IamModule } from '../iam/iam.module';

import { AuthProvider } from '../config/authentication.config';
import { rootConfigs } from '../config/root-configs';
import { CookieParserMiddleware } from '../common/middleware/cookie-parser.middleware';
import dataSource from '../db/datasource';
import { SecurityHeadersMiddleware } from '../common/middleware/security-headers.middleware';
import { SentryContextMiddleware } from '../common/middleware/sentry-context.middleware';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import type { RedisConfig } from '../config/redis.config';
import { BullModule } from '@nestjs/bullmq';
import { IsCloudUseCase } from './application/use-cases/is-cloud/is-cloud.use-case';
import { IsRegistrationDisabledUseCase } from './application/use-cases/is-registration-disabled/is-registration-disabled.use-case';
import { ClsModule } from 'nestjs-cls';
import { ContextModule } from 'src/common/context/context.module';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { SentryModule } from '@sentry/nestjs/setup';
import { ApplicationErrorFilter } from 'src/common/filters/application-error.filter';
import { PayloadTooLargeExceptionFilter } from 'src/common/filters/payload-too-large.filter';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: rootConfigs,
    }),
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
            // Note: maxRetriesPerRequest is intentionally omitted — BullMQ
            // forces it to null internally because it uses blocking Redis
            // commands (BRPOPLPUSH/BLMOVE) that must wait indefinitely.
            connectTimeout: 5000,
          },
        };
      },
    }),
    EventEmitterModule.forRoot(),
    SentryModule.forRoot(),
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
    // @SentryExceptionCaptured() on catch() reports unexpected errors to Sentry.
    // 4xx errors are dropped by the beforeSend hook in instrument.ts.
    {
      provide: APP_FILTER,
      useClass: PayloadTooLargeExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ApplicationErrorFilter,
    },
    Logger,
    CookieParserMiddleware,
    SecurityHeadersMiddleware,
    SentryContextMiddleware,
    IsCloudUseCase,
    IsRegistrationDisabledUseCase,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        CookieParserMiddleware,
        SecurityHeadersMiddleware,
        SentryContextMiddleware,
      )
      .forRoutes('*');
  }
}
