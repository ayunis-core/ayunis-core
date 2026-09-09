import { forwardRef, Module } from '@nestjs/common';
import { AssertWorkspaceWriteAccessUseCase } from './application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { AssertWorkspaceReadAccessUseCase } from './application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { AssertWorkspaceExecutionAccessUseCase } from './application/use-cases/assert-workspace-execution-access/assert-workspace-execution-access.use-case';
import { FavoritesModule } from 'src/domain/favorites/favorites.module';
import { SkillsModule } from 'src/domain/skills/skills.module';
import { KnowledgeBasesModule } from 'src/domain/knowledge-bases/knowledge-bases.module';
import { SourcesModule } from 'src/domain/sources/sources.module';
import { ThreadsModule } from 'src/domain/threads/threads.module';
import { WorkspacesRepository } from './application/ports/workspaces-repository.port';
import { LocalWorkspacesRepositoryModule } from './infrastructure/persistence/local/local-workspaces-repository.module';
import { LocalWorkspacesRepository } from './infrastructure/persistence/local/local-workspaces.repository';
import { CreateWorkspaceUseCase } from './application/use-cases/create-workspace/create-workspace.use-case';
import { FindAllWorkspacesUseCase } from './application/use-cases/find-all-workspaces/find-all-workspaces.use-case';
import { FindWorkspaceUseCase } from './application/use-cases/find-workspace/find-workspace.use-case';
import { UpdateWorkspaceUseCase } from './application/use-cases/update-workspace/update-workspace.use-case';
import { DeleteWorkspaceUseCase } from './application/use-cases/delete-workspace/delete-workspace.use-case';
import { WorkspacesController } from './presenters/http/workspaces.controller';
import { WorkspaceDtoMapper } from './presenters/http/mappers/workspace-dto.mapper';
import { FindWorkspacesByIdsUseCase } from './application/use-cases/find-workspaces-by-ids/find-workspaces-by-ids.use-case';
import { WorkspaceContextController } from './presenters/http/workspace-context.controller';
import { WorkspaceSkillSourcesController } from './presenters/http/workspace-skill-sources.controller';
import { WorkspaceContextDtoMapper } from './presenters/http/mappers/workspace-context-dto.mapper';
import { UpdateWorkspaceInstructionUseCase } from './application/use-cases/update-workspace-instruction/update-workspace-instruction.use-case';
import { BuildWorkspaceRunContextUseCase } from './application/use-cases/build-workspace-run-context/build-workspace-run-context.use-case';
import { GetWorkspaceAiContextUseCase } from './application/use-cases/get-workspace-ai-context/get-workspace-ai-context.use-case';
import { CreateWorkspaceSkillUseCase } from './application/use-cases/create-workspace-skill/create-workspace-skill.use-case';
import { DeleteWorkspaceSkillUseCase } from './application/use-cases/delete-workspace-skill/delete-workspace-skill.use-case';
import { ListWorkspaceSkillsUseCase } from './application/use-cases/list-workspace-skills/list-workspace-skills.use-case';
import { WorkspaceAccessService } from './application/services/workspace-access.service';
import { GetWorkspaceSkillUseCase } from './application/use-cases/get-workspace-skill/get-workspace-skill.use-case';
import { UpdateWorkspaceSkillUseCase } from './application/use-cases/update-workspace-skill/update-workspace-skill.use-case';
import { SetWorkspaceSkillActivationUseCase } from './application/use-cases/set-workspace-skill-activation/set-workspace-skill-activation.use-case';
import { SetWorkspaceSkillPinUseCase } from './application/use-cases/set-workspace-skill-pin/set-workspace-skill-pin.use-case';
import { SetWorkspaceSkillKnowledgeBaseUseCase } from './application/use-cases/set-workspace-skill-knowledge-base/set-workspace-skill-knowledge-base.use-case';
import { ListWorkspaceSkillSourcesUseCase } from './application/use-cases/list-workspace-skill-sources/list-workspace-skill-sources.use-case';
import { AddWorkspaceSkillFileUseCase } from './application/use-cases/add-workspace-skill-file/add-workspace-skill-file.use-case';
import { RemoveWorkspaceSkillSourceUseCase } from './application/use-cases/remove-workspace-skill-source/remove-workspace-skill-source.use-case';

@Module({
  imports: [
    LocalWorkspacesRepositoryModule,
    forwardRef(() => FavoritesModule),
    forwardRef(() => SkillsModule),
    forwardRef(() => KnowledgeBasesModule),
    SourcesModule,
    forwardRef(() => ThreadsModule),
  ],
  controllers: [
    WorkspacesController,
    WorkspaceContextController,
    WorkspaceSkillSourcesController,
  ],
  providers: [
    {
      provide: WorkspacesRepository,
      useExisting: LocalWorkspacesRepository,
    },
    CreateWorkspaceUseCase,
    FindAllWorkspacesUseCase,
    FindWorkspaceUseCase,
    FindWorkspacesByIdsUseCase,
    UpdateWorkspaceUseCase,
    DeleteWorkspaceUseCase,
    UpdateWorkspaceInstructionUseCase,
    GetWorkspaceAiContextUseCase,
    BuildWorkspaceRunContextUseCase,
    CreateWorkspaceSkillUseCase,
    DeleteWorkspaceSkillUseCase,
    ListWorkspaceSkillsUseCase,
    WorkspaceAccessService,
    AssertWorkspaceReadAccessUseCase,
    AssertWorkspaceWriteAccessUseCase,
    AssertWorkspaceExecutionAccessUseCase,
    GetWorkspaceSkillUseCase,
    UpdateWorkspaceSkillUseCase,
    SetWorkspaceSkillActivationUseCase,
    SetWorkspaceSkillPinUseCase,
    SetWorkspaceSkillKnowledgeBaseUseCase,
    ListWorkspaceSkillSourcesUseCase,
    AddWorkspaceSkillFileUseCase,
    RemoveWorkspaceSkillSourceUseCase,
    WorkspaceDtoMapper,
    WorkspaceContextDtoMapper,
  ],
  exports: [
    AssertWorkspaceReadAccessUseCase,
    AssertWorkspaceWriteAccessUseCase,
    AssertWorkspaceExecutionAccessUseCase,
    CreateWorkspaceUseCase,
    FindAllWorkspacesUseCase,
    FindWorkspaceUseCase,
    FindWorkspacesByIdsUseCase,
    UpdateWorkspaceUseCase,
    DeleteWorkspaceUseCase,
    GetWorkspaceAiContextUseCase,
    BuildWorkspaceRunContextUseCase,
  ],
})
export class WorkspacesModule {}
