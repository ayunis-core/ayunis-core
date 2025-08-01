import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThreadRecord } from './schema/thread.record';
import { ThreadSourceAssignmentRecord } from './schema/thread-source-assignment.record';
import { LocalThreadsRepository } from './local-threads.repository';
import { LocalMessagesRepositoryModule } from 'src/domain/messages/infrastructure/persistence/local/local-messages-repository.module';
import { ThreadMapper } from './mappers/thread.mapper';
import { ThreadSourceAssignmentMapper } from './mappers/thread-source-assignment.mapper';
import { LocalPermittedModelsRepositoryModule } from 'src/domain/models/infrastructure/persistence/local-permitted-models/local-permitted-models-repository.module';
import { LocalAgentsRepositoryModule } from 'src/domain/agents/infrastructure/persistence/local/local-agent-repository.module';
import { LocalSourceRepositoryModule } from 'src/domain/sources/infrastructure/persistence/local/local-source-repository.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ThreadRecord, ThreadSourceAssignmentRecord]),
    LocalMessagesRepositoryModule,
    LocalPermittedModelsRepositoryModule,
    LocalAgentsRepositoryModule,
    LocalSourceRepositoryModule,
  ],
  providers: [
    LocalThreadsRepository,
    ThreadMapper,
    ThreadSourceAssignmentMapper,
  ],
  exports: [LocalThreadsRepository, ThreadMapper, ThreadSourceAssignmentMapper],
})
export class LocalThreadsRepositoryModule {}
