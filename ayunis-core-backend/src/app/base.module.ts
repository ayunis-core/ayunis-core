import { DiscoveryModule } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { rootConfigs } from 'src/config/root-configs';
import { validateEnv } from 'src/config/env.validation';
import { ingestionTopology } from 'src/common/process/ingestion-topology';
import type { RedisConfig } from 'src/config/redis.config';
import dataSource from 'src/db/datasource';
import { ContextModule } from 'src/common/context/context.module';
import { LoggingModule } from 'src/common/logger/logging.module';

// Wiring every process needs (config, logging, database, queues); imported by
// AppModule and IngestionWorkerModule. Not a feature module.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: rootConfigs,
      validate: validateEnv,
    }),
    LoggingModule,
    DiscoveryModule,
    ClsModule.forRoot({
      global: true,
      middleware: { mount: !ingestionTopology.isWorker },
      plugins: [
        new ClsPluginTransactional({
          imports: [TypeOrmModule],
          adapter: new TransactionalAdapterTypeOrm({
            dataSourceToken: getDataSourceToken(),
          }),
        }),
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('typeorm')!,
      dataSourceFactory: async () => {
        if (ingestionTopology.isWorker)
          dataSource.setOptions({ migrationsRun: false });
        await dataSource.initialize();
        return dataSource;
      },
    }),
    BullModule.forRootAsync({
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
    }),
    EventEmitterModule.forRoot(),
    ContextModule,
  ],
})
export class BaseModule {}
