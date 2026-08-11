import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceRecord } from './schema/workspace.record';
import { WorkspaceUserSettingsRecord } from './schema/workspace-user-settings.record';
import { LocalWorkspacesRepository } from './local-workspaces.repository';
import { WorkspaceMapper } from './mappers/workspace.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkspaceRecord, WorkspaceUserSettingsRecord]),
  ],
  providers: [LocalWorkspacesRepository, WorkspaceMapper],
  exports: [LocalWorkspacesRepository],
})
export class LocalWorkspacesRepositoryModule {}
