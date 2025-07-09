import { Module, Logger, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ModelsModule } from '../domain/models/models.module';
import { AgentsModule } from '../domain/agents/agents.module';
import { MessagesModule } from '../domain/messages/messages.module';
import { ToolsModule } from '../domain/tools/tools.module';
import { ThreadsModule } from '../domain/threads/threads.module';
import { RunsModule } from '../domain/runs/runs.module';
import { SplitterModule } from '../domain/splitter/splitter.module';
import { EmbeddingsModule } from '../domain/embeddings/embeddings.module';
import { RetrieverModule } from '../domain/retrievers/retriever.module';
import { SourcesModule } from '../domain/sources/sources.module';
import { StorageModule } from '../domain/storage/storage.module';
import { PromptsModule } from '../domain/prompts/prompts.module';
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
import { CookieParserMiddleware } from '../common/middleware/cookie-parser.middleware';
import dataSource from '../db/datasource';
import { SecurityHeadersMiddleware } from '../common/middleware/security-headers.middleware';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

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
    IamModule.register({
      authProvider:
        (process.env.AUTH_PROVIDER as AuthProvider) || AuthProvider.LOCAL,
    }),
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    Logger,
    CookieParserMiddleware,
    SecurityHeadersMiddleware,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CookieParserMiddleware, SecurityHeadersMiddleware)
      .forRoutes('*');
  }
}
