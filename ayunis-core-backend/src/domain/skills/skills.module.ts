import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SourcesModule } from '../sources/sources.module';
import { McpModule } from '../mcp/mcp.module';
import { LocalSkillRepositoryModule } from './infrastructure/persistence/local/local-skill-repository.module';
import { LocalSkillRepository } from './infrastructure/persistence/local/local-skill.repository';
import { SkillRepository } from './application/ports/skill.repository';
import { SkillRecord } from './infrastructure/persistence/local/schema/skill.record';
import { SkillActivationRecord } from './infrastructure/persistence/local/schema/skill-activation.record';
import { McpIntegrationRecord } from '../mcp/infrastructure/persistence/postgres/schema/mcp-integration.record';

// Use Cases
import { CreateSkillUseCase } from './application/use-cases/create-skill/create-skill.use-case';
import { UpdateSkillUseCase } from './application/use-cases/update-skill/update-skill.use-case';
import { DeleteSkillUseCase } from './application/use-cases/delete-skill/delete-skill.use-case';
import { FindOneSkillUseCase } from './application/use-cases/find-one-skill/find-one-skill.use-case';
import { FindAllSkillsUseCase } from './application/use-cases/find-all-skills/find-all-skills.use-case';
import { ToggleSkillActiveUseCase } from './application/use-cases/toggle-skill-active/toggle-skill-active.use-case';
import { FindActiveSkillsUseCase } from './application/use-cases/find-active-skills/find-active-skills.use-case';
import { AddSourceToSkillUseCase } from './application/use-cases/add-source-to-skill/add-source-to-skill.use-case';
import { RemoveSourceFromSkillUseCase } from './application/use-cases/remove-source-from-skill/remove-source-from-skill.use-case';
import { ListSkillSourcesUseCase } from './application/use-cases/list-skill-sources/list-skill-sources.use-case';
import { AssignMcpIntegrationToSkillUseCase } from './application/use-cases/assign-mcp-integration-to-skill/assign-mcp-integration-to-skill.use-case';
import { UnassignMcpIntegrationFromSkillUseCase } from './application/use-cases/unassign-mcp-integration-from-skill/unassign-mcp-integration-from-skill.use-case';
import { ListSkillMcpIntegrationsUseCase } from './application/use-cases/list-skill-mcp-integrations/list-skill-mcp-integrations.use-case';
import { FindSkillByNameUseCase } from './application/use-cases/find-skill-by-name/find-skill-by-name.use-case';

// Presenters
import { SkillsController } from './presenters/http/skills.controller';
import { SkillDtoMapper } from './presenters/http/mappers/skill.mapper';
import { McpIntegrationDtoMapper } from '../mcp/presenters/http/mappers/mcp-integration-dto.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SkillRecord,
      SkillActivationRecord,
      McpIntegrationRecord,
    ]),
    LocalSkillRepositoryModule,
    SourcesModule,
    McpModule,
  ],
  providers: [
    {
      provide: SkillRepository,
      useClass: LocalSkillRepository,
    },
    // Use Cases
    CreateSkillUseCase,
    UpdateSkillUseCase,
    DeleteSkillUseCase,
    FindOneSkillUseCase,
    FindAllSkillsUseCase,
    ToggleSkillActiveUseCase,
    FindActiveSkillsUseCase,
    AddSourceToSkillUseCase,
    RemoveSourceFromSkillUseCase,
    ListSkillSourcesUseCase,
    AssignMcpIntegrationToSkillUseCase,
    UnassignMcpIntegrationFromSkillUseCase,
    ListSkillMcpIntegrationsUseCase,
    FindSkillByNameUseCase,

    // Presenters
    SkillDtoMapper,
    McpIntegrationDtoMapper,
  ],
  controllers: [SkillsController],
  exports: [
    FindActiveSkillsUseCase,
    FindOneSkillUseCase,
    AddSourceToSkillUseCase,
    FindSkillByNameUseCase,
  ],
})
export class SkillsModule {}
