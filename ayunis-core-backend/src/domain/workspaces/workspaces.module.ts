import { forwardRef, Module } from '@nestjs/common';
import { FavoritesModule } from 'src/domain/favorites/favorites.module';
import { SkillsModule } from 'src/domain/skills/skills.module';
import { KnowledgeBasesModule } from 'src/domain/knowledge-bases/knowledge-bases.module';
import { SourcesModule } from 'src/domain/sources/sources.module';
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
import { WorkspaceContextDtoMapper } from './presenters/http/mappers/workspace-context-dto.mapper';
import { AttachSkillToWorkspaceUseCase } from './application/use-cases/attach-skill-to-workspace/attach-skill-to-workspace.use-case';
import { DetachSkillFromWorkspaceUseCase } from './application/use-cases/detach-skill-from-workspace/detach-skill-from-workspace.use-case';
import { AttachKnowledgeBaseToWorkspaceUseCase } from './application/use-cases/attach-knowledge-base-to-workspace/attach-knowledge-base-to-workspace.use-case';
import { DetachKnowledgeBaseFromWorkspaceUseCase } from './application/use-cases/detach-knowledge-base-from-workspace/detach-knowledge-base-from-workspace.use-case';
import { AddDocumentToWorkspaceUseCase } from './application/use-cases/add-document-to-workspace/add-document-to-workspace.use-case';
import { RemoveDocumentFromWorkspaceUseCase } from './application/use-cases/remove-document-from-workspace/remove-document-from-workspace.use-case';
import { UpdateWorkspaceInstructionUseCase } from './application/use-cases/update-workspace-instruction/update-workspace-instruction.use-case';
import { BuildWorkspaceRunContextUseCase } from './application/use-cases/build-workspace-run-context/build-workspace-run-context.use-case';
import { ListWorkspaceSkillCandidatesUseCase } from './application/use-cases/list-workspace-skill-candidates/list-workspace-skill-candidates.use-case';
import { ListWorkspaceKnowledgeBaseCandidatesUseCase } from './application/use-cases/list-workspace-knowledge-base-candidates/list-workspace-knowledge-base-candidates.use-case';

@Module({
  imports: [
    LocalWorkspacesRepositoryModule,
    forwardRef(() => FavoritesModule),
    forwardRef(() => SkillsModule),
    forwardRef(() => KnowledgeBasesModule),
    SourcesModule,
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
    AttachSkillToWorkspaceUseCase,
    DetachSkillFromWorkspaceUseCase,
    AttachKnowledgeBaseToWorkspaceUseCase,
    DetachKnowledgeBaseFromWorkspaceUseCase,
    AddDocumentToWorkspaceUseCase,
    RemoveDocumentFromWorkspaceUseCase,
    UpdateWorkspaceInstructionUseCase,
    BuildWorkspaceRunContextUseCase,
    ListWorkspaceSkillCandidatesUseCase,
    ListWorkspaceKnowledgeBaseCandidatesUseCase,
    WorkspaceDtoMapper,
    WorkspaceContextDtoMapper,
  ],
  exports: [
    CreateWorkspaceUseCase,
    FindAllWorkspacesUseCase,
    FindWorkspaceUseCase,
    FindWorkspacesByIdsUseCase,
    UpdateWorkspaceUseCase,
    DeleteWorkspaceUseCase,
    BuildWorkspaceRunContextUseCase,
  ],
})
export class WorkspacesModule {}
