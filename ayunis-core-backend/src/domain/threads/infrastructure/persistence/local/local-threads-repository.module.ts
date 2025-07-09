import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThreadRecord } from './schema/thread.record';
import { LocalThreadsRepository } from './local-threads.repository';
import { LocalMessagesRepositoryModule } from 'src/domain/messages/infrastructure/persistence/local/local-messages-repository.module';
import { ThreadMapper } from './mappers/thread.mapper';
import { LocalSourceRepositoryModule } from 'src/domain/sources/infrastructure/persistence/local/local-source-repository.module';
import { LocalPermittedModelsRepositoryModule } from 'src/domain/models/infrastructure/persistence/local-permitted-models/local-permitted-models-repository.module';
import { LocalAgentsRepositoryModule } from 'src/domain/agents/infrastructure/persistence/local/local-agent-repository.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ThreadRecord]),
    LocalMessagesRepositoryModule,
    LocalSourceRepositoryModule,
    LocalPermittedModelsRepositoryModule,
    LocalAgentsRepositoryModule,
  ],
  providers: [LocalThreadsRepository, ThreadMapper],
  exports: [LocalThreadsRepository, ThreadMapper],
})
export class LocalThreadsRepositoryModule {}
