import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalAgentRepository } from './local-agent.repository';
import { AgentRecord } from './schema/agent.record';
import { AgentMapper } from './mappers/agent.mapper';
import { LocalPermittedModelsRepositoryModule } from 'src/domain/models/infrastructure/persistence/local-permitted-models/local-permitted-models-repository.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentRecord]),
    LocalPermittedModelsRepositoryModule,
  ],
  providers: [AgentMapper, LocalAgentRepository],
  exports: [LocalAgentRepository, AgentMapper],
})
export class LocalRepositoryModule {}
