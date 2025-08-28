import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalAgentRepository } from './local-agent.repository';
import { AgentRecord } from './schema/agent.record';
import { AgentMapper } from './mappers/agent.mapper';
import { LocalPermittedModelsRepositoryModule } from 'src/domain/models/infrastructure/persistence/local-permitted-models/local-permitted-models-repository.module';
import { LocalToolConfigRepositoryModule } from 'src/domain/tools/infrastructure/persistence/local/local-tool-config-repository.module';
import { AgentToolMapper } from './mappers/agent-tool.mapper';
import { AgentSourceAssignmentMapper } from './mappers/agent-source-assignment.mapper';
import { ToolsModule } from 'src/domain/tools/tools.module';
import { LocalSourceRepositoryModule } from 'src/domain/sources/infrastructure/persistence/local/local-source-repository.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentRecord]),
    LocalPermittedModelsRepositoryModule,
    LocalToolConfigRepositoryModule,
    LocalSourceRepositoryModule,
    ToolsModule,
  ],
  providers: [
    AgentMapper,
    LocalAgentRepository,
    AgentToolMapper,
    AgentSourceAssignmentMapper,
  ],
  exports: [LocalAgentRepository, AgentMapper],
})
export class LocalAgentsRepositoryModule {}
