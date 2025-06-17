import { Module } from '@nestjs/common';
import { ModelsModule } from 'src/domain/models/models.module';
import { ToolsModule } from 'src/domain/tools/tools.module';
import { LocalRepositoryModule } from './infrastructure/persistence/local/local-agent-repository.module';
import { LocalAgentRepository } from './infrastructure/persistence/local/local-agent.repository';
import { AgentRepository } from './application/ports/agent.repository';
import { AgentRecord } from './infrastructure/persistence/local/schema/agent.record';
import { TypeOrmModule } from '@nestjs/typeorm';

// Use Cases
import { CreateAgentUseCase } from './application/use-cases/create-agent/create-agent.use-case';
import { FindAgentUseCase } from './application/use-cases/find-agent/find-agent.use-case';
import { FindManyAgentsUseCase } from './application/use-cases/find-many-agents/find-many-agents.use-case';
import { FindAllAgentsByOwnerUseCase } from './application/use-cases/find-all-agents-by-owner/find-all-agents-by-owner.use-case';
import { DeleteAgentUseCase } from './application/use-cases/delete-agent/delete-agent.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentRecord]),
    LocalRepositoryModule,
    ModelsModule,
    ToolsModule,
  ],
  providers: [
    {
      provide: AgentRepository,
      useClass: LocalAgentRepository,
    },
    // Use Cases
    CreateAgentUseCase,
    FindAgentUseCase,
    FindManyAgentsUseCase,
    FindAllAgentsByOwnerUseCase,
    DeleteAgentUseCase,
  ],
  exports: [
    CreateAgentUseCase,
    FindAgentUseCase,
    FindManyAgentsUseCase,
    FindAllAgentsByOwnerUseCase,
    DeleteAgentUseCase,
  ],
})
export class AgentsModule {}
