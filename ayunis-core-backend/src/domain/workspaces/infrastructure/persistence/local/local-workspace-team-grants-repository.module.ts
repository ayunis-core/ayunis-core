import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalWorkspaceTeamGrantsRepository } from './local-workspace-team-grants.repository';
import { WorkspaceTeamGrantMapper } from './mappers/workspace-team-grant.mapper';
import { WorkspaceTeamGrantRecord } from './schema/workspace-team-grant.record';

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceTeamGrantRecord])],
  providers: [LocalWorkspaceTeamGrantsRepository, WorkspaceTeamGrantMapper],
  exports: [LocalWorkspaceTeamGrantsRepository],
})
export class LocalWorkspaceTeamGrantsRepositoryModule {}
