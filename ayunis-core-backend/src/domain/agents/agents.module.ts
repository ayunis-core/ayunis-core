import { forwardRef, Module } from '@nestjs/common';
import { ModelsModule } from 'src/domain/models/models.module';
import { ToolsModule } from 'src/domain/tools/tools.module';
import { SourcesModule } from 'src/domain/sources/sources.module';
import { LocalAgentsRepositoryModule } from './infrastructure/persistence/local/local-agent-repository.module';
import { LocalAgentRepository } from './infrastructure/persistence/local/local-agent.repository';
import { AgentRepository } from './application/ports/agent.repository';
import { AgentRecord } from './infrastructure/persistence/local/schema/agent.record';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from 'src/common/common.module';

// Use Cases
import { CreateAgentUseCase } from './application/use-cases/create-agent/create-agent.use-case';
import { GetAgentUseCase } from './application/use-cases/get-agent/get-agent.use-case';
import { FindManyAgentsUseCase } from './application/use-cases/find-many-agents/find-many-agents.use-case';
import { FindAllAgentsByOwnerUseCase } from './application/use-cases/find-all-agents-by-owner/find-all-agents-by-owner.use-case';
import { DeleteAgentUseCase } from './application/use-cases/delete-agent/delete-agent.use-case';
import { UpdateAgentUseCase } from './application/use-cases/update-agent/update-agent.use-case';
import { ReplaceModelWithUserDefaultUseCase } from './application/use-cases/replace-model-with-user-default/replace-model-with-user-default.use-case';
import { AddSourceToAgentUseCase } from './application/use-cases/add-source-to-agent/add-source-to-agent.use-case';
import { RemoveSourceFromAgentUseCase } from './application/use-cases/remove-source-from-agent/remove-source-from-agent.use-case';
import { GetAgentSourcesUseCase } from './application/use-cases/get-agent-sources/get-agent-sources.use-case';

// Presenters
import { AgentsController } from './presenters/http/agents.controller';
import { AgentDtoMapper } from './presenters/http/mappers/agent.mapper';
import { ThreadsModule } from '../threads/threads.module';
import { SourceDtoMapper } from '../threads/presenters/http/mappers/source.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentRecord]),
    LocalAgentsRepositoryModule,
    forwardRef(() => ModelsModule),
    forwardRef(() => ThreadsModule),
    SourcesModule,
    ToolsModule,
    CommonModule,
  ],
  providers: [
    {
      provide: AgentRepository,
      useClass: LocalAgentRepository,
    },
    // Use Cases
    CreateAgentUseCase,
    GetAgentUseCase,
    FindManyAgentsUseCase,
    FindAllAgentsByOwnerUseCase,
    UpdateAgentUseCase,
    DeleteAgentUseCase,
    ReplaceModelWithUserDefaultUseCase,
    AddSourceToAgentUseCase,
    RemoveSourceFromAgentUseCase,
    GetAgentSourcesUseCase,
    // Presenters
    AgentDtoMapper,
    SourceDtoMapper,
  ],
  controllers: [AgentsController],
  exports: [
    CreateAgentUseCase,
    GetAgentUseCase,
    FindManyAgentsUseCase,
    FindAllAgentsByOwnerUseCase,
    UpdateAgentUseCase,
    DeleteAgentUseCase,
    ReplaceModelWithUserDefaultUseCase,
  ],
})
export class AgentsModule {}
