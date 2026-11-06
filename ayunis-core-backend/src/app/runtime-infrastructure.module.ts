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
import { ingestionProcessRole } from 'src/config/ingestion.config';
import type { RedisConfig } from 'src/config/redis.config';
import dataSource from 'src/db/datasource';
import { ContextModule } from 'src/common/context/context.module';
import { LoggingModule } from 'src/common/logger/logging.module';
import { IngestionRuntimeService } from './infrastructure/ingestion-runtime.service';

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
      middleware: { mount: ingestionProcessRole() !== 'worker' },
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
        if (ingestionProcessRole() === 'worker')
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
  providers: [IngestionRuntimeService],
  exports: [IngestionRuntimeService],
})
export class RuntimeInfrastructureModule {}
