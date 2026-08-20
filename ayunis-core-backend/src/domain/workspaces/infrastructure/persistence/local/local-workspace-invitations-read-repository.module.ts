import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalWorkspaceInvitationsReadRepository } from './local-workspace-invitations-read.repository';
import { WorkspaceInvitationMapper } from './mappers/workspace-invitation.mapper';
import { WorkspaceMapper } from './mappers/workspace.mapper';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceMemberRecord])],
  providers: [
    LocalWorkspaceInvitationsReadRepository,
    WorkspaceInvitationMapper,
    WorkspaceMapper,
  ],
  exports: [LocalWorkspaceInvitationsReadRepository],
})
export class LocalWorkspaceInvitationsReadRepositoryModule {}
