import { Module, Logger, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './presenters/http/app.controller';
import { ModelsModule } from '../domain/models/models.module';
import { AgentsModule } from '../domain/agents/agents.module';
import { MessagesModule } from '../domain/messages/messages.module';
import { ToolsModule } from '../domain/tools/tools.module';
import { ThreadsModule } from '../domain/threads/threads.module';
import { RunsModule } from '../domain/runs/runs.module';
import { SplitterModule } from '../domain/rag/splitters/splitter.module';
import { EmbeddingsModule } from '../domain/rag/embeddings/embeddings.module';
import { RetrieverModule } from '../domain/retrievers/retriever.module';
import { SourcesModule } from '../domain/sources/sources.module';
import { StorageModule } from '../domain/storage/storage.module';
import { PromptsModule } from '../domain/prompts/prompts.module';
import { SharesModule } from '../domain/shares/shares.module';
import { McpModule } from '../domain/mcp/mcp.module';
import { IamModule } from '../iam/iam.module';
import { AdminModule } from '../admin/admin.module';
import { modelsConfig } from '../config/models.config';
import {
  AuthProvider,
  authenticationConfig,
} from '../config/authentication.config';
import { typeormConfig } from '../config/typeorm.config';
import { embeddingsConfig } from '../config/embeddings.config';
import storageConfig from '../config/storage.config';
import { webConfig } from '../config/web.config';
import { appConfig } from '../config/app.config';
import { adminConfig } from '../config/admin.config';
import { legalConfig } from '../config/legal.config';
import { subscriptionsConfig } from '../config/subscriptions.config';
import { emailsConfig } from '../config/emails.config';
import { CookieParserMiddleware } from '../common/middleware/cookie-parser.middleware';
import dataSource from '../db/datasource';
import { SecurityHeadersMiddleware } from '../common/middleware/security-headers.middleware';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import internetSearchConfig from 'src/config/internet-search.config';
import { mcpConfig } from '../config/mcp.config';
import { IsCloudUseCase } from './application/use-cases/is-cloud/is-cloud.use-case';
import { IsRegistrationDisabledUseCase } from './application/use-cases/is-registration-disabled/is-registration-disabled.use-case';
import { ClsModule } from 'nestjs-cls';
import { ContextModule } from 'src/common/context/context.module';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { SentryModule } from '@sentry/nestjs/setup';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        modelsConfig,
        authenticationConfig,
        typeormConfig,
        embeddingsConfig,
        storageConfig,
        webConfig,
        appConfig,
        adminConfig,
        legalConfig,
        subscriptionsConfig,
        emailsConfig,
        internetSearchConfig,
        mcpConfig,
      ],
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
    SentryModule.forRoot(),
    ContextModule, // Global
    ModelsModule,
    AgentsModule,
    MessagesModule,
    ToolsModule,
    ThreadsModule,
    RunsModule,
    SplitterModule,
    EmbeddingsModule,
    RetrieverModule,
    SourcesModule,
    StorageModule,
    PromptsModule,
    SharesModule,
    McpModule,
    IamModule.register({
      authProvider:
        (process.env.AUTH_PROVIDER as AuthProvider) || AuthProvider.LOCAL,
    }),
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    Logger,
    CookieParserMiddleware,
    SecurityHeadersMiddleware,
    IsCloudUseCase,
    IsRegistrationDisabledUseCase,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CookieParserMiddleware, SecurityHeadersMiddleware)
      .forRoutes('*');
  }
}
