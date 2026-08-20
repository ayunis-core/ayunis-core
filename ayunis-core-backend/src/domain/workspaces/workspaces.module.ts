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
import { ListWorkspaceSkillsUseCase } from './application/use-cases/list-workspace-skills/list-workspace-skills.use-case';
import { ListWorkspaceKnowledgeBasesUseCase } from './application/use-cases/list-workspace-knowledge-bases/list-workspace-knowledge-bases.use-case';
import { ListWorkspaceDocumentsUseCase } from './application/use-cases/list-workspace-documents/list-workspace-documents.use-case';
import { TeamsModule } from 'src/iam/teams/teams.module';
import { WorkspaceAccessRepository } from './application/ports/workspace-access-repository.port';
import { LocalWorkspaceAccessRepository } from './infrastructure/persistence/local/local-workspace-access.repository';
import { WorkspaceAccessService } from './application/services/workspace-access.service';
import { WorkspaceAccessPolicyService } from './application/services/workspace-access-policy.service';
import { GetWorkspaceAccessUseCase } from './application/use-cases/get-workspace-access/get-workspace-access.use-case';
import { UsersModule } from 'src/iam/users/users.module';
import { InviteWorkspaceMemberUseCase } from './application/use-cases/invite-workspace-member/invite-workspace-member.use-case';
import { AcceptWorkspaceInvitationUseCase } from './application/use-cases/accept-workspace-invitation/accept-workspace-invitation.use-case';
import { DeclineWorkspaceInvitationUseCase } from './application/use-cases/decline-workspace-invitation/decline-workspace-invitation.use-case';
import { UpdateWorkspaceMemberRoleUseCase } from './application/use-cases/update-workspace-member-role/update-workspace-member-role.use-case';
import { RemoveWorkspaceMemberUseCase } from './application/use-cases/remove-workspace-member/remove-workspace-member.use-case';
import { WorkspaceMembersRepository } from './application/ports/workspace-members-repository.port';
import { LocalWorkspaceMembersRepository } from './infrastructure/persistence/local/local-workspace-members.repository';
import { LocalWorkspaceMembersRepositoryModule } from './infrastructure/persistence/local/local-workspace-members-repository.module';
import { WorkspaceTeamGrantsRepository } from './application/ports/workspace-team-grants-repository.port';
import { LocalWorkspaceTeamGrantsRepository } from './infrastructure/persistence/local/local-workspace-team-grants.repository';
import { LocalWorkspaceTeamGrantsRepositoryModule } from './infrastructure/persistence/local/local-workspace-team-grants-repository.module';
import { AddWorkspaceTeamGrantUseCase } from './application/use-cases/add-workspace-team-grant/add-workspace-team-grant.use-case';
import { UpdateWorkspaceTeamGrantRoleUseCase } from './application/use-cases/update-workspace-team-grant-role/update-workspace-team-grant-role.use-case';
import { RemoveWorkspaceTeamGrantUseCase } from './application/use-cases/remove-workspace-team-grant/remove-workspace-team-grant.use-case';
import { WorkspaceTeamMemberOverridesRepository } from './application/ports/workspace-team-member-overrides-repository.port';
import { LocalWorkspaceTeamMemberOverridesRepository } from './infrastructure/persistence/local/local-workspace-team-member-overrides.repository';
import { LocalWorkspaceTeamMemberOverridesRepositoryModule } from './infrastructure/persistence/local/local-workspace-team-member-overrides-repository.module';
import { SetWorkspaceTeamMemberOverrideUseCase } from './application/use-cases/set-workspace-team-member-override/set-workspace-team-member-override.use-case';
import { ResetWorkspaceTeamMemberOverrideUseCase } from './application/use-cases/reset-workspace-team-member-override/reset-workspace-team-member-override.use-case';
import { WorkspaceSharingReadRepository } from './application/ports/workspace-sharing-read-repository.port';
import { LocalWorkspaceSharingReadRepository } from './infrastructure/persistence/local/local-workspace-sharing-read.repository';
import { LocalWorkspaceSharingReadRepositoryModule } from './infrastructure/persistence/local/local-workspace-sharing-read-repository.module';
import { GetWorkspaceSharingUseCase } from './application/use-cases/get-workspace-sharing/get-workspace-sharing.use-case';
import { WorkspaceInvitationsReadRepository } from './application/ports/workspace-invitations-read-repository.port';
import { LocalWorkspaceInvitationsReadRepository } from './infrastructure/persistence/local/local-workspace-invitations-read.repository';
import { LocalWorkspaceInvitationsReadRepositoryModule } from './infrastructure/persistence/local/local-workspace-invitations-read-repository.module';
import { ListMyWorkspaceInvitationsUseCase } from './application/use-cases/list-my-workspace-invitations/list-my-workspace-invitations.use-case';

@Module({
  imports: [
    LocalWorkspacesRepositoryModule,
    LocalWorkspaceMembersRepositoryModule,
    LocalWorkspaceTeamGrantsRepositoryModule,
    LocalWorkspaceTeamMemberOverridesRepositoryModule,
    LocalWorkspaceSharingReadRepositoryModule,
    LocalWorkspaceInvitationsReadRepositoryModule,
    forwardRef(() => FavoritesModule),
    forwardRef(() => SkillsModule),
    forwardRef(() => KnowledgeBasesModule),
    SourcesModule,
    TeamsModule,
    UsersModule,
  ],
  controllers: [WorkspacesController, WorkspaceContextController],
  providers: [
    {
      provide: WorkspacesRepository,
      useExisting: LocalWorkspacesRepository,
    },
    {
      provide: WorkspaceAccessRepository,
      useExisting: LocalWorkspaceAccessRepository,
    },
    {
      provide: WorkspaceMembersRepository,
      useExisting: LocalWorkspaceMembersRepository,
    },
    {
      provide: WorkspaceTeamGrantsRepository,
      useExisting: LocalWorkspaceTeamGrantsRepository,
    },
    {
      provide: WorkspaceTeamMemberOverridesRepository,
      useExisting: LocalWorkspaceTeamMemberOverridesRepository,
    },
    {
      provide: WorkspaceSharingReadRepository,
      useExisting: LocalWorkspaceSharingReadRepository,
    },
    {
      provide: WorkspaceInvitationsReadRepository,
      useExisting: LocalWorkspaceInvitationsReadRepository,
    },
    WorkspaceAccessPolicyService,
    WorkspaceAccessService,
    GetWorkspaceAccessUseCase,
    InviteWorkspaceMemberUseCase,
    AcceptWorkspaceInvitationUseCase,
    DeclineWorkspaceInvitationUseCase,
    UpdateWorkspaceMemberRoleUseCase,
    RemoveWorkspaceMemberUseCase,
    AddWorkspaceTeamGrantUseCase,
    UpdateWorkspaceTeamGrantRoleUseCase,
    RemoveWorkspaceTeamGrantUseCase,
    SetWorkspaceTeamMemberOverrideUseCase,
    ResetWorkspaceTeamMemberOverrideUseCase,
    GetWorkspaceSharingUseCase,
    ListMyWorkspaceInvitationsUseCase,
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
    ListWorkspaceSkillsUseCase,
    ListWorkspaceKnowledgeBasesUseCase,
    ListWorkspaceDocumentsUseCase,
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
    GetWorkspaceAccessUseCase,
  ],
})
export class WorkspacesModule {}
