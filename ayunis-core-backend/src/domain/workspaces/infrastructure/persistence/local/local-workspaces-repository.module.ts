import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceRecord } from './schema/workspace.record';
import { LocalWorkspacesRepository } from './local-workspaces.repository';
import { WorkspaceMapper } from './mappers/workspace.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceRecord])],
  providers: [LocalWorkspacesRepository, WorkspaceMapper],
  exports: [LocalWorkspacesRepository],
})
export class LocalWorkspacesRepositoryModule {}
