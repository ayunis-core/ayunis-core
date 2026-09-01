import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceRecord } from './schema/workspace.record';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { WorkspaceSourceAssignmentRecord } from './schema/workspace-source-assignment.record';
import { LocalWorkspacesRepository } from './local-workspaces.repository';
import { WorkspaceMapper } from './mappers/workspace.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkspaceRecord,
      SkillRecord,
      KnowledgeBaseRecord,
      WorkspaceSourceAssignmentRecord,
    ]),
  ],
  providers: [LocalWorkspacesRepository, WorkspaceMapper],
  exports: [LocalWorkspacesRepository],
})
export class LocalWorkspacesRepositoryModule {}
