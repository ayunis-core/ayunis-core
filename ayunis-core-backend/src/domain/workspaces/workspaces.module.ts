import { forwardRef, Module } from '@nestjs/common';
import { FavoritesModule } from 'src/domain/favorites/favorites.module';
import { KnowledgeBasesModule } from 'src/domain/knowledge-bases/knowledge-bases.module';
import { SkillsModule } from 'src/domain/skills/skills.module';
import { ThreadsModule } from 'src/domain/threads/threads.module';
import { WorkspaceAccessService } from './application/services/workspace-access.service';
import { WorkspaceDeletionService } from './application/services/workspace-deletion.service';
import { WorkspacesUserDeletionRequestedListener } from './application/listeners/user-deletion-requested.listener';
import { WorkspacesRepository } from './application/ports/workspaces-repository.port';
import { WorkspaceMembersRepository } from './application/ports/workspace-members-repository.port';
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
import { GetWorkspaceRolePermissionsUseCase } from './application/use-cases/get-workspace-role-permissions/get-workspace-role-permissions.use-case';
import { PermissionsModule } from 'src/iam/permissions/permissions.module';
import { UsersModule } from 'src/iam/users/users.module';
import { WorkspaceMemberProfilesService } from './application/services/workspace-member-profiles.service';
import { ListWorkspaceMemberCandidatesUseCase } from './application/use-cases/list-workspace-member-candidates/list-workspace-member-candidates.use-case';
import { ListWorkspaceMembersUseCase } from './application/use-cases/list-workspace-members/list-workspace-members.use-case';
import { AddWorkspaceMembersUseCase } from './application/use-cases/add-workspace-members/add-workspace-members.use-case';
import { UpdateWorkspaceMemberRoleUseCase } from './application/use-cases/update-workspace-member-role/update-workspace-member-role.use-case';
import { WorkspaceMembersController } from './presenters/http/workspace-members.controller';
import { WorkspaceMemberDtoMapper } from './presenters/http/mappers/workspace-member-dto.mapper';
import { LocalWorkspacesRepositoryModule } from './infrastructure/persistence/local/local-workspaces-repository.module';
import { LocalWorkspacesRepository } from './infrastructure/persistence/local/local-workspaces.repository';
import { LocalWorkspaceMembersRepository } from './infrastructure/persistence/local/local-workspace-members.repository';
import { WorkspaceContextController } from './presenters/http/workspace-context.controller';
import { WorkspacesController } from './presenters/http/workspaces.controller';
import { WorkspaceContextDtoMapper } from './presenters/http/mappers/workspace-context-dto.mapper';
import { WorkspaceDtoMapper } from './presenters/http/mappers/workspace-dto.mapper';

@Module({
  imports: [
    LocalWorkspacesRepositoryModule,
    PermissionsModule,
    UsersModule,
    forwardRef(() => FavoritesModule),
    forwardRef(() => SkillsModule),
    forwardRef(() => KnowledgeBasesModule),
    forwardRef(() => ThreadsModule),
  ],
  controllers: [
    WorkspacesController,
    WorkspaceMembersController,
    WorkspaceContextController,
  ],
  providers: [
    {
      provide: WorkspacesRepository,
      useExisting: LocalWorkspacesRepository,
    },
    {
      provide: WorkspaceMembersRepository,
      useExisting: LocalWorkspaceMembersRepository,
    },
    CreateWorkspaceUseCase,
    FindAllWorkspacesUseCase,
    FindWorkspaceUseCase,
    FindWorkspacesByIdsUseCase,
    UpdateWorkspaceUseCase,
    DeleteWorkspaceUseCase,
    UpdateWorkspaceInstructionUseCase,
    GetWorkspaceRolePermissionsUseCase,
    ListWorkspaceMembersUseCase,
    ListWorkspaceMemberCandidatesUseCase,
    AddWorkspaceMembersUseCase,
    UpdateWorkspaceMemberRoleUseCase,
    GetWorkspaceAiContextUseCase,
    BuildWorkspaceRunContextUseCase,
    WorkspaceAccessService,
    WorkspaceDeletionService,
    WorkspaceMemberProfilesService,
    WorkspacesUserDeletionRequestedListener,
    AssertWorkspaceReadAccessUseCase,
    AssertWorkspaceWriteAccessUseCase,
    AssertWorkspaceExecutionAccessUseCase,
    WorkspaceDtoMapper,
    WorkspaceMemberDtoMapper,
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
