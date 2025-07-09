import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalAgentRepository } from './local-agent.repository';
import { AgentRecord } from './schema/agent.record';
import { AgentMapper } from './mappers/agent.mapper';
import { LocalPermittedModelsRepositoryModule } from 'src/domain/models/infrastructure/persistence/local-permitted-models/local-permitted-models-repository.module';
import { LocalToolConfigRepositoryModule } from 'src/domain/tools/infrastructure/persistence/local/local-tool-config-repository.module';
import { AgentToolMapper } from './mappers/agent-tool.mapper';
import { ToolsModule } from 'src/domain/tools/tools.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentRecord]),
    LocalPermittedModelsRepositoryModule,
    LocalToolConfigRepositoryModule,
    ToolsModule,
  ],
  providers: [AgentMapper, LocalAgentRepository, AgentToolMapper],
  exports: [LocalAgentRepository, AgentMapper],
})
export class LocalAgentsRepositoryModule {}
