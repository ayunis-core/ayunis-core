import { DiscoveryModule } from '@nestjs/core';
import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { rootConfigs } from 'src/config/root-configs';
import { validateEnv } from 'src/config/env.validation';
import type { RedisConfig } from 'src/config/redis.config';
import dataSource from 'src/db/datasource';
import { ContextModule } from 'src/common/context/context.module';
import { LoggingModule } from 'src/common/logger/logging.module';

interface BaseModuleOptions {
  /** Request-scoped CLS middleware; only a process serving HTTP mounts it. */
  httpMiddleware: boolean;
  /** Only the API migrates the schema; a worker starts against it as is. */
  runMigrations: boolean;
}

function clsModule(options: BaseModuleOptions): DynamicModule {
  return ClsModule.forRoot({
    global: true,
    middleware: { mount: options.httpMiddleware },
    plugins: [
      new ClsPluginTransactional({
        imports: [TypeOrmModule],
        adapter: new TransactionalAdapterTypeOrm({
          dataSourceToken: getDataSourceToken(),
        }),
      }),
    ],
  });
}

function databaseModule(options: BaseModuleOptions): DynamicModule {
  return TypeOrmModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => config.get('typeorm')!,
    dataSourceFactory: async () => {
      if (!options.runMigrations)
        dataSource.setOptions({ migrationsRun: false });
      await dataSource.initialize();
      return dataSource;
    },
  });
}

function queueModule(): DynamicModule {
  return BullModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
      const redis = config.get<RedisConfig>('redis')!;
      return {
        prefix: process.env.BULLMQ_PREFIX || 'bull',
        connection: {
          host: redis.host,
          port: redis.port,
          password: redis.password,
          connectTimeout: 5000,
        },
      };
    },
  });
}

// Wiring every process needs (config, logging, database, queues); imported by
// AppModule and IngestionWorkerModule. Not a feature module.
@Module({})
export class BaseModule {
  static forApi(): DynamicModule {
    return BaseModule.build({ httpMiddleware: true, runMigrations: true });
  }

  static forWorker(): DynamicModule {
    return BaseModule.build({ httpMiddleware: false, runMigrations: false });
  }

  private static build(options: BaseModuleOptions): DynamicModule {
    return {
      module: BaseModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: rootConfigs,
          validate: validateEnv,
        }),
        LoggingModule,
        DiscoveryModule,
        clsModule(options),
        databaseModule(options),
        queueModule(),
        EventEmitterModule.forRoot(),
        ContextModule,
      ],
    };
  }
}
