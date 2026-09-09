import { forwardRef, Module } from '@nestjs/common';
import { FavoritesModule } from 'src/domain/favorites/favorites.module';
import { KnowledgeBasesModule } from 'src/domain/knowledge-bases/knowledge-bases.module';
import { SkillsModule } from 'src/domain/skills/skills.module';
import { ThreadsModule } from 'src/domain/threads/threads.module';
import { WorkspaceAccessService } from './application/services/workspace-access.service';
import { WorkspacesRepository } from './application/ports/workspaces-repository.port';
import { AssertWorkspaceExecutionAccessUseCase } from './application/use-cases/assert-workspace-execution-access/assert-workspace-execution-access.use-case';
import { AssertWorkspaceReadAccessUseCase } from './application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { AssertWorkspaceWriteAccessUseCase } from './application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { BuildWorkspaceRunContextUseCase } from './application/use-cases/build-workspace-run-context/build-workspace-run-context.use-case';
import { CreateWorkspaceUseCase } from './application/use-cases/create-workspace/create-workspace.use-case';
import { DeleteWorkspaceUseCase } from './application/use-cases/delete-workspace/delete-workspace.use-case';
import { FindAllWorkspacesUseCase } from './application/use-cases/find-all-workspaces/find-all-workspaces.use-case';
import { FindWorkspaceUseCase } from './application/use-cases/find-workspace/find-workspace.use-case';
import { FindWorkspacesByIdsUseCase } from './application/use-cases/find-workspaces-by-ids/find-workspaces-by-ids.use-case';
import { GetWorkspaceAiContextUseCase } from './application/use-cases/get-workspace-ai-context/get-workspace-ai-context.use-case';
import { UpdateWorkspaceInstructionUseCase } from './application/use-cases/update-workspace-instruction/update-workspace-instruction.use-case';
import { UpdateWorkspaceUseCase } from './application/use-cases/update-workspace/update-workspace.use-case';
import { LocalWorkspacesRepositoryModule } from './infrastructure/persistence/local/local-workspaces-repository.module';
import { LocalWorkspacesRepository } from './infrastructure/persistence/local/local-workspaces.repository';
import { WorkspaceContextController } from './presenters/http/workspace-context.controller';
import { WorkspacesController } from './presenters/http/workspaces.controller';
import { WorkspaceContextDtoMapper } from './presenters/http/mappers/workspace-context-dto.mapper';
import { WorkspaceDtoMapper } from './presenters/http/mappers/workspace-dto.mapper';

@Module({
  imports: [
    LocalWorkspacesRepositoryModule,
    forwardRef(() => FavoritesModule),
    forwardRef(() => SkillsModule),
    forwardRef(() => KnowledgeBasesModule),
    forwardRef(() => ThreadsModule),
  ],
  controllers: [WorkspacesController, WorkspaceContextController],
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
    WorkspaceAccessService,
    AssertWorkspaceReadAccessUseCase,
    AssertWorkspaceWriteAccessUseCase,
    AssertWorkspaceExecutionAccessUseCase,
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
