import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceRecord } from './schema/workspace.record';
import { WorkspaceSkillAssignmentRecord } from './schema/workspace-skill-assignment.record';
import { WorkspaceKnowledgeBaseAssignmentRecord } from './schema/workspace-knowledge-base-assignment.record';
import { WorkspaceSourceAssignmentRecord } from './schema/workspace-source-assignment.record';
import { LocalWorkspacesRepository } from './local-workspaces.repository';
import { WorkspaceMapper } from './mappers/workspace.mapper';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';
import { WorkspaceTeamGrantRecord } from './schema/workspace-team-grant.record';
import { WorkspaceTeamMemberOverrideRecord } from './schema/workspace-team-member-override.record';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkspaceRecord,
      WorkspaceSkillAssignmentRecord,
      WorkspaceKnowledgeBaseAssignmentRecord,
      WorkspaceSourceAssignmentRecord,
      WorkspaceMemberRecord,
      WorkspaceTeamGrantRecord,
      WorkspaceTeamMemberOverrideRecord,
    ]),
  ],
  providers: [LocalWorkspacesRepository, WorkspaceMapper],
  exports: [LocalWorkspacesRepository],
})
export class LocalWorkspacesRepositoryModule {}
