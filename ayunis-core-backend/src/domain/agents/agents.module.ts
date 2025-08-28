import { forwardRef, Module } from '@nestjs/common';
import { ModelsModule } from 'src/domain/models/models.module';
import { ToolsModule } from 'src/domain/tools/tools.module';
import { SourcesModule } from '../sources/sources.module';
import { LocalAgentsRepositoryModule } from './infrastructure/persistence/local/local-agent-repository.module';
import { LocalAgentRepository } from './infrastructure/persistence/local/local-agent.repository';
import { AgentRepository } from './application/ports/agent.repository';
import { AgentRecord } from './infrastructure/persistence/local/schema/agent.record';
import { AgentSourceAssignmentRecord } from './infrastructure/persistence/local/schema/agent-source-assignment.record';
import { TypeOrmModule } from '@nestjs/typeorm';

// Use Cases
import { CreateAgentUseCase } from './application/use-cases/create-agent/create-agent.use-case';
import { FindOneAgentUseCase } from './application/use-cases/find-one-agent/find-one-agent.use-case';
import { FindManyAgentsUseCase } from './application/use-cases/find-many-agents/find-many-agents.use-case';
import { FindAllAgentsByOwnerUseCase } from './application/use-cases/find-all-agents-by-owner/find-all-agents-by-owner.use-case';
import { DeleteAgentUseCase } from './application/use-cases/delete-agent/delete-agent.use-case';
import { UpdateAgentUseCase } from './application/use-cases/update-agent/update-agent.use-case';
import { ReplaceModelWithUserDefaultUseCase } from './application/use-cases/replace-model-with-user-default/replace-model-with-user-default.use-case';
import { AddSourceToAgentUseCase } from './application/use-cases/add-source-to-agent/add-source-to-agent.use-case';
import { RemoveSourceFromAgentUseCase } from './application/use-cases/remove-source-from-agent/remove-source-from-agent.use-case';

// Presenters
import { AgentsController } from './presenters/http/agents.controller';
import { AgentDtoMapper } from './presenters/http/mappers/agent.mapper';
import { AgentSourceDtoMapper } from './presenters/http/mappers/agent-source.mapper';
import { ThreadsModule } from '../threads/threads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentRecord, AgentSourceAssignmentRecord]),
    LocalAgentsRepositoryModule,
    forwardRef(() => ModelsModule),
    forwardRef(() => ThreadsModule),
    SourcesModule,
    ToolsModule,
  ],
  providers: [
    {
      provide: AgentRepository,
      useClass: LocalAgentRepository,
    },
    // Use Cases
    CreateAgentUseCase,
    FindOneAgentUseCase,
    FindManyAgentsUseCase,
    FindAllAgentsByOwnerUseCase,
    UpdateAgentUseCase,
    DeleteAgentUseCase,
    ReplaceModelWithUserDefaultUseCase,
    AddSourceToAgentUseCase,
    RemoveSourceFromAgentUseCase,
    // Presenters
    AgentDtoMapper,
    AgentSourceDtoMapper,
  ],
  controllers: [AgentsController],
  exports: [
    CreateAgentUseCase,
    FindOneAgentUseCase,
    FindManyAgentsUseCase,
    FindAllAgentsByOwnerUseCase,
    UpdateAgentUseCase,
    DeleteAgentUseCase,
    ReplaceModelWithUserDefaultUseCase,
    AddSourceToAgentUseCase,
    RemoveSourceFromAgentUseCase,
  ],
})
export class AgentsModule {}
