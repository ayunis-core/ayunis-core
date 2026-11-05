import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { BaseModule } from './base.module';
import { QueueWorkerRuntimeService } from './infrastructure/queue-worker-runtime.service';
import { ModelsModule } from 'src/domain/models/models.module';
import { IngestionConsumersModule } from './ingestion-consumers.module';

@Module({
  imports: [
    BaseModule.forWorker(),
    DiscoveryModule,
    ModelsModule,
    IngestionConsumersModule,
  ],
  providers: [QueueWorkerRuntimeService],
})
export class IngestionWorkerModule {}
