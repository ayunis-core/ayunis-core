import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalWorkspaceTeamMemberOverridesRepository } from './local-workspace-team-member-overrides.repository';
import { WorkspaceTeamMemberOverrideMapper } from './mappers/workspace-team-member-override.mapper';
import { WorkspaceTeamGrantRecord } from './schema/workspace-team-grant.record';
import { WorkspaceTeamMemberOverrideRecord } from './schema/workspace-team-member-override.record';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkspaceTeamGrantRecord,
      WorkspaceTeamMemberOverrideRecord,
    ]),
  ],
  providers: [
    LocalWorkspaceTeamMemberOverridesRepository,
    WorkspaceTeamMemberOverrideMapper,
  ],
  exports: [LocalWorkspaceTeamMemberOverridesRepository],
})
export class LocalWorkspaceTeamMemberOverridesRepositoryModule {}
