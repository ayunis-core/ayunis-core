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
import { UpdateWorkspaceMemberAccessLevelUseCase } from './application/use-cases/update-workspace-member-access-level/update-workspace-member-access-level.use-case';
import { RemoveWorkspaceMemberUseCase } from './application/use-cases/remove-workspace-member/remove-workspace-member.use-case';
import { WorkspaceMembersRepository } from './application/ports/workspace-members-repository.port';
import { LocalWorkspaceMembersRepository } from './infrastructure/persistence/local/local-workspace-members.repository';
import { LocalWorkspaceMembersRepositoryModule } from './infrastructure/persistence/local/local-workspace-members-repository.module';

@Module({
  imports: [
    LocalWorkspacesRepositoryModule,
    LocalWorkspaceMembersRepositoryModule,
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
    WorkspaceAccessPolicyService,
    WorkspaceAccessService,
    GetWorkspaceAccessUseCase,
    InviteWorkspaceMemberUseCase,
    AcceptWorkspaceInvitationUseCase,
    DeclineWorkspaceInvitationUseCase,
    UpdateWorkspaceMemberAccessLevelUseCase,
    RemoveWorkspaceMemberUseCase,
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
