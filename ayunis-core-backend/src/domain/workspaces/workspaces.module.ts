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
import { DescribeLinkedWorkspacesUseCase } from './application/use-cases/describe-linked-workspaces/describe-linked-workspaces.use-case';
import { OwnershipModule } from 'src/domain/ownership/ownership.module';
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

import { TeamsModule } from 'src/iam/teams/teams.module';
import { PermissionsModule } from 'src/iam/permissions/permissions.module';
import { UsersModule } from 'src/iam/users/users.module';
import { WorkspaceSharingRepository } from './application/ports/workspace-sharing.repository';
import { LocalWorkspaceSharingRepository } from './infrastructure/persistence/local/local-workspace-sharing.repository';
import { WorkspaceDirectoryService } from './application/services/workspace-directory.service';
import { WorkspaceSummaryService } from './application/services/workspace-summary.service';
import { WorkspaceLinkCleanupService } from './application/services/workspace-link-cleanup.service';
import { WorkspaceSharingContextService } from './application/services/workspace-sharing-context.service';
import { GetWorkspaceSharingUseCase } from './application/use-cases/get-workspace-sharing/get-workspace-sharing.use-case';
import { ListShareCandidatesUseCase } from './application/use-cases/list-share-candidates/list-share-candidates.use-case';
import { ShareWorkspaceUseCase } from './application/use-cases/share-workspace/share-workspace.use-case';
import { SetWorkspaceMemberAccessUseCase } from './application/use-cases/set-workspace-member-access/set-workspace-member-access.use-case';
import { RemoveWorkspaceMemberUseCase } from './application/use-cases/remove-workspace-member/remove-workspace-member.use-case';
import { SetWorkspaceOrganizationSharingUseCase } from './application/use-cases/set-workspace-organization-sharing/set-workspace-organization-sharing.use-case';
import { EndWorkspaceTeamSharingUseCase } from './application/use-cases/end-workspace-team-sharing/end-workspace-team-sharing.use-case';
import { FindAccessibleWorkspaceIdsUseCase } from './application/use-cases/find-accessible-workspace-ids/find-accessible-workspace-ids.use-case';
import { WorkspacesTeamMembershipEndedListener } from './application/listeners/team-membership-ended.listener';
import { WorkspaceSharingController } from './presenters/http/workspace-sharing.controller';
import { WorkspaceOwnershipController } from './presenters/http/workspace-ownership.controller';
import { WorkspaceOwnershipService } from './application/services/workspace-ownership.service';
import { WorkspaceDeletionService } from './application/services/workspace-deletion.service';
import { TransferWorkspaceOwnershipUseCase } from './application/use-cases/transfer-workspace-ownership/transfer-workspace-ownership.use-case';
import { ListOwnershipCandidatesUseCase } from './application/use-cases/list-ownership-candidates/list-ownership-candidates.use-case';
import { WorkspacesUserDeletionRequestedListener } from './application/listeners/user-deletion-requested.listener';

@Module({
  imports: [
    LocalWorkspacesRepositoryModule,
    OwnershipModule,
    TeamsModule,
    UsersModule,
    PermissionsModule,
    forwardRef(() => FavoritesModule),
    forwardRef(() => SkillsModule),
    forwardRef(() => KnowledgeBasesModule),
    forwardRef(() => ThreadsModule),
  ],
  controllers: [
    WorkspacesController,
    WorkspaceContextController,
    WorkspaceSharingController,
    WorkspaceOwnershipController,
  ],
  providers: [
    {
      provide: WorkspacesRepository,
      useExisting: LocalWorkspacesRepository,
    },
    {
      provide: WorkspaceSharingRepository,
      useExisting: LocalWorkspaceSharingRepository,
    },
    WorkspaceDirectoryService,
    WorkspaceSummaryService,
    WorkspaceLinkCleanupService,
    WorkspaceSharingContextService,
    GetWorkspaceSharingUseCase,
    ListShareCandidatesUseCase,
    ShareWorkspaceUseCase,
    SetWorkspaceMemberAccessUseCase,
    RemoveWorkspaceMemberUseCase,
    SetWorkspaceOrganizationSharingUseCase,
    EndWorkspaceTeamSharingUseCase,
    FindAccessibleWorkspaceIdsUseCase,
    WorkspacesTeamMembershipEndedListener,
    WorkspaceOwnershipService,
    WorkspaceDeletionService,
    TransferWorkspaceOwnershipUseCase,
    ListOwnershipCandidatesUseCase,
    WorkspacesUserDeletionRequestedListener,
    CreateWorkspaceUseCase,
    FindAllWorkspacesUseCase,
    FindWorkspaceUseCase,
    FindWorkspacesByIdsUseCase,
    DescribeLinkedWorkspacesUseCase,
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
    FindAccessibleWorkspaceIdsUseCase,
    AssertWorkspaceReadAccessUseCase,
    AssertWorkspaceWriteAccessUseCase,
    AssertWorkspaceExecutionAccessUseCase,
    CreateWorkspaceUseCase,
    FindAllWorkspacesUseCase,
    FindWorkspaceUseCase,
    FindWorkspacesByIdsUseCase,
    DescribeLinkedWorkspacesUseCase,
    UpdateWorkspaceUseCase,
    DeleteWorkspaceUseCase,
    GetWorkspaceAiContextUseCase,
    BuildWorkspaceRunContextUseCase,
  ],
})
export class WorkspacesModule {}
