import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceRecord } from './schema/workspace.record';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { KnowledgeBaseActivationRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base-activation.record';
import { LocalWorkspacesRepository } from './local-workspaces.repository';
import { WorkspaceMapper } from './mappers/workspace.mapper';
import { LocalWorkspaceSharingRepository } from './local-workspace-sharing.repository';
import { WorkspaceAccessPersonRecord } from './schema/workspace-access-person.record';
import { WorkspaceAccessTeamRecord } from './schema/workspace-access-team.record';
import { WorkspaceAccessTeamOverrideRecord } from './schema/workspace-access-team-override.record';
import { WorkspaceAccessOrgExclusionRecord } from './schema/workspace-access-org-exclusion.record';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkspaceRecord,
      SkillRecord,
      KnowledgeBaseRecord,
      KnowledgeBaseActivationRecord,
      WorkspaceAccessPersonRecord,
      WorkspaceAccessTeamRecord,
      WorkspaceAccessTeamOverrideRecord,
      WorkspaceAccessOrgExclusionRecord,
    ]),
  ],
  providers: [
    LocalWorkspacesRepository,
    LocalWorkspaceSharingRepository,
    WorkspaceMapper,
  ],
  exports: [LocalWorkspacesRepository, LocalWorkspaceSharingRepository],
})
export class LocalWorkspacesRepositoryModule {}
