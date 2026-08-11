import { Module } from '@nestjs/common';
import { WorkspacesRepository } from './application/ports/workspaces-repository.port';
import { LocalWorkspacesRepositoryModule } from './infrastructure/persistence/local/local-workspaces-repository.module';
import { LocalWorkspacesRepository } from './infrastructure/persistence/local/local-workspaces.repository';
import { CreateWorkspaceUseCase } from './application/use-cases/create-workspace/create-workspace.use-case';
import { FindAllWorkspacesUseCase } from './application/use-cases/find-all-workspaces/find-all-workspaces.use-case';
import { FindWorkspaceUseCase } from './application/use-cases/find-workspace/find-workspace.use-case';
import { UpdateWorkspaceUseCase } from './application/use-cases/update-workspace/update-workspace.use-case';
import { DeleteWorkspaceUseCase } from './application/use-cases/delete-workspace/delete-workspace.use-case';
import { ToggleWorkspacePinnedUseCase } from './application/use-cases/toggle-workspace-pinned/toggle-workspace-pinned.use-case';
import { ReorderWorkspacesUseCase } from './application/use-cases/reorder-workspaces/reorder-workspaces.use-case';
import { WorkspacesController } from './presenters/http/workspaces.controller';
import { WorkspaceDtoMapper } from './presenters/http/mappers/workspace-dto.mapper';

@Module({
  imports: [LocalWorkspacesRepositoryModule],
  controllers: [WorkspacesController],
  providers: [
    {
      provide: WorkspacesRepository,
      useExisting: LocalWorkspacesRepository,
    },
    CreateWorkspaceUseCase,
    FindAllWorkspacesUseCase,
    FindWorkspaceUseCase,
    UpdateWorkspaceUseCase,
    DeleteWorkspaceUseCase,
    ToggleWorkspacePinnedUseCase,
    ReorderWorkspacesUseCase,
    WorkspaceDtoMapper,
  ],
  exports: [
    CreateWorkspaceUseCase,
    FindAllWorkspacesUseCase,
    FindWorkspaceUseCase,
    UpdateWorkspaceUseCase,
    DeleteWorkspaceUseCase,
    ToggleWorkspacePinnedUseCase,
    ReorderWorkspacesUseCase,
  ],
})
export class WorkspacesModule {}
