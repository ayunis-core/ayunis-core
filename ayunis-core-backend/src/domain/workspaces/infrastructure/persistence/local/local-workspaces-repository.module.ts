import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceRecord } from './schema/workspace.record';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { KnowledgeBaseActivationRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base-activation.record';
import { LocalWorkspacesRepository } from './local-workspaces.repository';
import { LocalWorkspaceMembersRepository } from './local-workspace-members.repository';
import { WorkspaceMapper } from './mappers/workspace.mapper';
import { WorkspaceMemberMapper } from './mappers/workspace-member.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkspaceRecord,
      WorkspaceMemberRecord,
      SkillRecord,
      KnowledgeBaseRecord,
      KnowledgeBaseActivationRecord,
    ]),
  ],
  providers: [
    LocalWorkspacesRepository,
    LocalWorkspaceMembersRepository,
    WorkspaceMapper,
    WorkspaceMemberMapper,
  ],
  exports: [LocalWorkspacesRepository, LocalWorkspaceMembersRepository],
})
export class LocalWorkspacesRepositoryModule {}
