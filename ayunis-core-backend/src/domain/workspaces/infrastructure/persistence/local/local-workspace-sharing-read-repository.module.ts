import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalWorkspaceSharingReadRepository } from './local-workspace-sharing-read.repository';
import { WorkspaceMemberMapper } from './mappers/workspace-member.mapper';
import { WorkspaceSharingMapper } from './mappers/workspace-sharing.mapper';
import { WorkspaceTeamGrantMapper } from './mappers/workspace-team-grant.mapper';
import { WorkspaceTeamMemberOverrideMapper } from './mappers/workspace-team-member-override.mapper';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';
import { WorkspaceTeamGrantRecord } from './schema/workspace-team-grant.record';
import { WorkspaceTeamMemberOverrideRecord } from './schema/workspace-team-member-override.record';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkspaceMemberRecord,
      WorkspaceTeamGrantRecord,
      WorkspaceTeamMemberOverrideRecord,
    ]),
  ],
  providers: [
    LocalWorkspaceSharingReadRepository,
    WorkspaceMemberMapper,
    WorkspaceSharingMapper,
    WorkspaceTeamGrantMapper,
    WorkspaceTeamMemberOverrideMapper,
  ],
  exports: [LocalWorkspaceSharingReadRepository],
})
export class LocalWorkspaceSharingReadRepositoryModule {}
