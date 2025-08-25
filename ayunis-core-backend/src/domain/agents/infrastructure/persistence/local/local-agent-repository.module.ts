import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalAgentRepository } from './local-agent.repository';
import { AgentRecord } from './schema/agent.record';
import { AgentSourceAssignmentRecord } from './schema/agent-source-assignment.record';
import { AgentMapper } from './mappers/agent.mapper';
import { AgentSourceAssignmentMapper } from './mappers/agent-source-assignment.mapper';
import { LocalPermittedModelsRepositoryModule } from 'src/domain/models/infrastructure/persistence/local-permitted-models/local-permitted-models-repository.module';
import { LocalToolConfigRepositoryModule } from 'src/domain/tools/infrastructure/persistence/local/local-tool-config-repository.module';
import { LocalSourcesRepositoryModule } from 'src/domain/sources/infrastructure/persistence/local/local-sources-repository.module';
import { AgentToolMapper } from './mappers/agent-tool.mapper';
import { ToolsModule } from 'src/domain/tools/tools.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentRecord, AgentSourceAssignmentRecord]),
    LocalPermittedModelsRepositoryModule,
    LocalToolConfigRepositoryModule,
    LocalSourcesRepositoryModule,
    ToolsModule,
  ],
  providers: [AgentMapper, LocalAgentRepository, AgentToolMapper, AgentSourceAssignmentMapper],
  exports: [LocalAgentRepository, AgentMapper],
})
export class LocalAgentsRepositoryModule {}
